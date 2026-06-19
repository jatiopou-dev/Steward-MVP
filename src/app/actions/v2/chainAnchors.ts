'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  reanchorPeriodSchema,
  getAnchorSchema,
  type ReanchorPeriodInput,
  type GetAnchorInput,
} from '@/lib/validation/v2';
import type {
  ChainAnchor,
  ReconciliationPeriod,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';
import { buildAnchorPayload, hashAnchorPayload, submitAnchorTx } from '@/lib/blockchain/anchor';
import { lastDayOfMonth } from '@/lib/utils/date';

const ANCHOR_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];

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

// Internal — called by closePeriod after successful period write.
// Never throws — anchor failure is logged but does not block period close.
export async function anchorPeriod(
  period: ReconciliationPeriod,
  actorId: string
): Promise<void> {
  const admin = createAdminClient();

  try {
    const { data: donations } = await admin
      .from('donations')
      .select('id')
      .eq('organisation_id', period.organisation_id)
      .gte('transaction_date', `${period.year}-${String(period.month).padStart(2, '0')}-01`)
      .lte('transaction_date', lastDayOfMonth(period.year, period.month));

    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('id')
      .eq('organisation_id', period.organisation_id)
      .eq('entity_id', period.id);

    const donationIds = (donations ?? []).map((d: { id: string }) => d.id);
    const auditLogIds = (auditLogs ?? []).map((a: { id: string }) => a.id);

    const payload = buildAnchorPayload({
      organisation_id: period.organisation_id,
      period_id: period.id,
      year: period.year,
      month: period.month,
      total_pence: period.total_pence,
      donation_count: period.donation_count,
      donation_ids: donationIds,
      audit_log_ids: auditLogIds,
      closed_by: actorId,
      closed_at: period.closed_at ?? new Date().toISOString(),
      prev_anchor_tx_hash: null,
    });

    const hash = hashAnchorPayload(payload);
    const { tx_hash, block_number } = await submitAnchorTx(hash);

    await admin.from('chain_anchors').insert({
      organisation_id: period.organisation_id,
      period_id: period.id,
      chain: process.env.ANCHOR_CHAIN ?? 'polygon',
      chain_id: parseInt(process.env.ANCHOR_CHAIN_ID ?? '137', 10),
      tx_hash,
      block_number,
      anchor_hash: hash,
      anchor_data: payload,
      prev_anchor_tx_hash: null,
      anchored_by: actorId,
    });

    await admin
      .from('reconciliation_periods')
      .update({ anchor_tx_hash: tx_hash })
      .eq('id', period.id);

    await createAuditLog({
      organisation_id: period.organisation_id,
      actor_user_id: actorId,
      action: 'chain_anchor.created',
      entity_type: 'chain_anchor',
      entity_id: period.id,
      new_data: { tx_hash, chain: process.env.ANCHOR_CHAIN ?? 'polygon' },
    });
  } catch (err) {
    await createAuditLog({
      organisation_id: period.organisation_id,
      actor_user_id: actorId,
      action: 'chain_anchor.failed',
      entity_type: 'chain_anchor',
      entity_id: period.id,
      new_data: { error: err instanceof Error ? err.message : String(err) },
    });
  }
}

export async function reanchorPeriod(
  input: ReanchorPeriodInput
): Promise<ActionResult<ChainAnchor>> {
  const parsed = reanchorPeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, period_id } = parsed.data;

  const actorId = await requireRole(organisation_id, ANCHOR_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('chain_anchors')
    .select('id')
    .eq('period_id', period_id)
    .eq('organisation_id', organisation_id)
    .maybeSingle();

  if (existing) return { error: 'Period is already anchored' };

  const { data: period } = await admin
    .from('reconciliation_periods')
    .select('*')
    .eq('id', period_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!period) return { error: 'Period not found' };
  if (period.status !== 'closed') return { error: 'Only closed periods can be anchored' };

  const { data: donations } = await admin
    .from('donations')
    .select('id')
    .eq('organisation_id', organisation_id)
    .gte('transaction_date', `${period.year}-${String(period.month).padStart(2, '0')}-01`)
    .lte('transaction_date', lastDayOfMonth(period.year, period.month));

  const { data: auditLogs } = await admin
    .from('audit_logs')
    .select('id')
    .eq('organisation_id', organisation_id)
    .eq('entity_id', period_id);

  const donationIds = (donations ?? []).map((d: { id: string }) => d.id);
  const auditLogIds = (auditLogs ?? []).map((a: { id: string }) => a.id);

  const payload = buildAnchorPayload({
    organisation_id,
    period_id,
    year: period.year,
    month: period.month,
    total_pence: period.total_pence,
    donation_count: period.donation_count,
    donation_ids: donationIds,
    audit_log_ids: auditLogIds,
    closed_by: period.closed_by ?? actorId,
    closed_at: period.closed_at ?? new Date().toISOString(),
    prev_anchor_tx_hash: null,
  });

  const hash = hashAnchorPayload(payload);

  let tx_hash: string;
  let block_number: number;

  try {
    ({ tx_hash, block_number } = await submitAnchorTx(hash));
  } catch (err) {
    return { error: `Anchor tx failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  const { data: anchor, error: insertError } = await admin
    .from('chain_anchors')
    .insert({
      organisation_id,
      period_id,
      chain: process.env.ANCHOR_CHAIN ?? 'polygon',
      chain_id: parseInt(process.env.ANCHOR_CHAIN_ID ?? '137', 10),
      tx_hash,
      block_number,
      anchor_hash: hash,
      anchor_data: payload,
      prev_anchor_tx_hash: null,
      anchored_by: actorId,
    })
    .select()
    .single();

  if (insertError || !anchor) return { error: insertError?.message ?? 'Failed to store anchor' };

  await admin
    .from('reconciliation_periods')
    .update({ anchor_tx_hash: tx_hash })
    .eq('id', period_id);

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'chain_anchor.reanchored',
    entity_type: 'chain_anchor',
    entity_id: period_id,
    new_data: { tx_hash, chain: process.env.ANCHOR_CHAIN ?? 'polygon' },
  });

  return { data: anchor as unknown as ChainAnchor };
}

export async function getAnchor(
  input: GetAnchorInput
): Promise<ActionResult<ChainAnchor | null>> {
  const parsed = getAnchorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, period_id } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Permission denied' };

  const { data, error } = await supabase
    .from('chain_anchors')
    .select('*')
    .eq('organisation_id', organisation_id)
    .eq('period_id', period_id)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: (data ?? null) as unknown as ChainAnchor | null };
}
