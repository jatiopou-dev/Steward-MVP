'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createDonorSchema,
  updateDonorSchema,
  type CreateDonorInput,
  type UpdateDonorInput,
} from '@/lib/validation/v2';
import type { Donor, ActionResult, MemberRole } from '@/lib/types/v2';
import { createAuditLog } from './audit';

const DONOR_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'finance_assistant', 'auditor'];
const DONOR_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'finance_assistant'];

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

export async function createDonor(
  input: CreateDonorInput
): Promise<ActionResult<Donor>> {
  const parsed = createDonorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, DONOR_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_assistant or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('donors')
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create donor' };

  await createAuditLog({
    organisation_id: parsed.data.organisation_id,
    actor_user_id: actorId,
    action: 'donor.created',
    entity_type: 'donor',
    entity_id: data.id,
    new_data: { display_name: data.display_name },
  });

  return { data };
}

export async function getDonor(
  id: string,
  orgId: string
): Promise<ActionResult<Donor>> {
  if (!id || !orgId) return { error: 'ID and organisation ID required' };

  const actorId = await requireRole(orgId, DONOR_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (error || !data) return { error: 'Donor not found or access denied' };
  return { data };
}

export async function listDonors(
  orgId: string
): Promise<ActionResult<Donor[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const actorId = await requireRole(orgId, DONOR_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .eq('organisation_id', orgId)
    .order('display_name', { ascending: true });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function updateDonor(
  input: UpdateDonorInput
): Promise<ActionResult<Donor>> {
  const parsed = updateDonorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, DONOR_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_assistant or above required' };

  const admin = createAdminClient();

  const { data: current } = await admin
    .from('donors')
    .select('display_name, email, external_reference, gift_aid_eligible')
    .eq('id', parsed.data.id)
    .eq('organisation_id', parsed.data.organisation_id)
    .single();

  if (!current) return { error: 'Donor not found' };

  const { id, organisation_id, ...updates } = parsed.data;

  const { data, error } = await admin
    .from('donors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', organisation_id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to update donor' };

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'donor.updated',
    entity_type: 'donor',
    entity_id: id,
    previous_data: current,
    new_data: updates,
  });

  return { data };
}
