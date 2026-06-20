'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createDeclarationSchema,
  revokeDeclarationSchema,
  listDeclarationsSchema,
  createClaimSchema,
  submitClaimSchema,
  type CreateDeclarationInput,
  type RevokeDeclarationInput,
  type ListDeclarationsInput,
  type CreateClaimInput,
  type SubmitClaimInput,
} from '@/lib/validation/v2';
import { isDeclarationActive } from '@/lib/giftAid/declarations';
import type {
  GiftAidDeclaration,
  GiftAidClaim,
  SubmitClaimResult,
  ClaimSummary,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';
import { buildCharitiesOnlineCsv, type CsvDonationRow } from '@/lib/giftAid/csv';

const GA_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
const GA_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

async function requireRole(orgId: string, roles: MemberRole[]): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('organisation_id', orgId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!data) return null;
  return (roles as string[]).includes(data.role) ? user.id : null;
}

export async function createDeclaration(
  input: CreateDeclarationInput
): Promise<ActionResult<GiftAidDeclaration>> {
  const parsed = createDeclarationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, donor_id } = parsed.data;

  const actorId = await requireRole(organisation_id, GA_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: donor } = await admin
    .from('donors')
    .select('id, gift_aid_eligible')
    .eq('id', donor_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!donor) return { error: 'Donor not found' };
  if (!donor.gift_aid_eligible) return { error: 'Donor is not marked as Gift Aid eligible' };

  const { data, error } = await admin
    .from('gift_aid_declarations')
    .insert({ ...parsed.data, created_by: actorId })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create declaration' };

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'gift_aid.declaration_created',
    entity_type: 'gift_aid_declaration',
    entity_id: data.id,
    new_data: { donor_id, declaration_type: parsed.data.declaration_type },
  });

  return { data };
}

export async function revokeDeclaration(
  input: RevokeDeclarationInput
): Promise<ActionResult<GiftAidDeclaration>> {
  const parsed = revokeDeclarationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, declaration_id } = parsed.data;

  const actorId = await requireRole(organisation_id, GA_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('gift_aid_declarations')
    .select('id, revoked_at')
    .eq('id', declaration_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!existing) return { error: 'Declaration not found' };
  if (existing.revoked_at) return { error: 'Declaration is already revoked' };

  const { data, error } = await admin
    .from('gift_aid_declarations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', declaration_id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to revoke declaration' };

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'gift_aid.declaration_revoked',
    entity_type: 'gift_aid_declaration',
    entity_id: declaration_id,
    new_data: { revoked_at: data.revoked_at },
  });

  return { data };
}

export async function listDeclarations(
  input: ListDeclarationsInput
): Promise<ActionResult<GiftAidDeclaration[]>> {
  const parsed = listDeclarationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, donor_id } = parsed.data;

  const actorId = await requireRole(organisation_id, GA_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  let query = supabase
    .from('gift_aid_declarations')
    .select('*')
    .eq('organisation_id', organisation_id)
    .order('created_at', { ascending: false });

  if (donor_id) query = query.eq('donor_id', donor_id);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function createClaim(
  input: CreateClaimInput
): Promise<ActionResult<GiftAidClaim>> {
  const parsed = createClaimSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, claim_period_from, claim_period_to } = parsed.data;

  const actorId = await requireRole(organisation_id, GA_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: donations } = await admin
    .from('donations')
    .select('id, donor_id, amount_pence, transaction_date')
    .eq('organisation_id', organisation_id)
    .gte('transaction_date', claim_period_from)
    .lte('transaction_date', claim_period_to);

  const { data: declarations } = await admin
    .from('gift_aid_declarations')
    .select('id, donor_id, effective_from, effective_to, revoked_at')
    .eq('organisation_id', organisation_id);

  const { data: eligibleDonors } = await admin
    .from('donors')
    .select('id')
    .eq('organisation_id', organisation_id)
    .eq('gift_aid_eligible', true);

  const eligibleDonorIds = new Set((eligibleDonors ?? []).map((d: { id: string }) => d.id));

  const { data: submittedClaimDonationsRaw } = await admin
    .from('gift_aid_claim_donations')
    .select('donation_id, gift_aid_claims!inner(status)')
    .eq('gift_aid_claims.status', 'submitted');

  const submittedClaimDonations = submittedClaimDonationsRaw as Array<{
    donation_id: string;
    gift_aid_claims: { status: string } | null;
  }> | null;

  const alreadyClaimedIds = new Set(
    (submittedClaimDonations ?? []).map((r) => r.donation_id)
  );

  const claimRows: Array<{ donation_id: string; declaration_id: string; gift_aid_pence: number }> = [];
  let total_donations_pence = 0;
  let total_gift_aid_pence = 0;

  for (const donation of donations ?? []) {
    if (!eligibleDonorIds.has(donation.donor_id)) continue;
    if (alreadyClaimedIds.has(donation.id)) continue;

    const matchingDeclaration = (declarations ?? []).find(
      (decl: { id: string; donor_id: string; effective_from: string; effective_to: string | null; revoked_at: string | null }) =>
        decl.donor_id === donation.donor_id &&
        isDeclarationActive(decl, donation.transaction_date)
    );

    if (!matchingDeclaration) continue;

    const gift_aid_pence = Math.round(donation.amount_pence * 25.0 / 100.0);
    claimRows.push({
      donation_id: donation.id,
      declaration_id: matchingDeclaration.id,
      gift_aid_pence,
    });
    total_donations_pence += donation.amount_pence;
    total_gift_aid_pence += gift_aid_pence;
  }

  const { data: claim, error: claimError } = await admin
    .from('gift_aid_claims')
    .insert({
      organisation_id,
      claim_period_from,
      claim_period_to,
      total_donations_pence,
      total_gift_aid_pence,
      donation_count: claimRows.length,
      status: 'draft',
      created_by: actorId,
    })
    .select()
    .single();

  if (claimError || !claim) return { error: claimError?.message ?? 'Failed to create claim' };

  if (claimRows.length > 0) {
    const { error: rowsError } = await admin
      .from('gift_aid_claim_donations')
      .insert(claimRows.map((r) => ({ claim_id: claim.id, ...r })));

    if (rowsError) return { error: `Claim created but failed to link donations: ${rowsError.message}` };
  }

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'gift_aid.claim_created',
    entity_type: 'gift_aid_claim',
    entity_id: claim.id,
    new_data: { claim_period_from, claim_period_to, donation_count: claimRows.length, total_gift_aid_pence },
  });

  return { data: claim };
}

export async function submitClaim(
  input: SubmitClaimInput
): Promise<ActionResult<SubmitClaimResult>> {
  const parsed = submitClaimSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, claim_id } = parsed.data;

  const actorId = await requireRole(organisation_id, GA_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: existingClaim } = await admin
    .from('gift_aid_claims')
    .select('*')
    .eq('id', claim_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!existingClaim) return { error: 'Claim not found' };
  if (existingClaim.status === 'submitted') return { error: 'Claim is already submitted' };

  const { data: claimRows } = await admin
    .from('gift_aid_claim_donations')
    .select('donation_id, gift_aid_pence')
    .eq('claim_id', claim_id);

  const donationIds = (claimRows ?? []).map((r: { donation_id: string }) => r.donation_id);

  let csvRows: CsvDonationRow[] = [];

  if (donationIds.length > 0) {
    const { data: rawData } = await admin
      .from('donations')
      .select('id, transaction_date, amount_pence, donors(display_name)')
      .in('id', donationIds);

    const donationsWithDonors = rawData as Array<{
      id: string;
      transaction_date: string;
      amount_pence: number;
      donors: { display_name: string } | null;
    }> | null;

    csvRows = (donationsWithDonors ?? []).map((d) => ({
      donor_display_name: d.donors?.display_name ?? 'Unknown',
      transaction_date: d.transaction_date,
      amount_pence: d.amount_pence,
    }));
  }

  const { data: updatedClaim, error: updateError } = await admin
    .from('gift_aid_claims')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: actorId,
    })
    .eq('id', claim_id)
    .select()
    .single();

  if (updateError || !updatedClaim) {
    return { error: updateError?.message ?? 'Failed to submit claim' };
  }

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'gift_aid.claim_submitted',
    entity_type: 'gift_aid_claim',
    entity_id: claim_id,
    new_data: {
      donation_count: updatedClaim.donation_count,
      total_gift_aid_pence: updatedClaim.total_gift_aid_pence,
    },
  });

  const csv = buildCharitiesOnlineCsv(csvRows);

  const summary: ClaimSummary = {
    claim: updatedClaim,
    donation_count: updatedClaim.donation_count,
    total_donations_pence: updatedClaim.total_donations_pence,
    total_gift_aid_pence: updatedClaim.total_gift_aid_pence,
  };

  return { data: { claim: updatedClaim, summary, csv } };
}
