'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  closePeriodSchema,
  getPeriodSchema,
  type ClosePeriodInput,
  type GetPeriodInput,
} from '@/lib/validation/v2';
import type {
  ReconciliationPeriod,
  AppealSummary,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';

const RECON_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
const RECON_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

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

// Internal helper — not a server action endpoint.
// Returns true if the given date falls in a closed period for the org.
export async function checkPeriodLocked(
  organisation_id: string,
  transaction_date: string
): Promise<boolean> {
  const [yearStr, monthStr] = transaction_date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('reconciliation_periods')
    .select('id')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .eq('status', 'closed')
    .maybeSingle();

  return data !== null;
}

export async function closePeriod(
  input: ClosePeriodInput
): Promise<ActionResult<ReconciliationPeriod>> {
  const parsed = closePeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, year, month } = parsed.data;

  const actorId = await requireRole(organisation_id, RECON_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  // Check not already closed
  const { data: existing } = await admin
    .from('reconciliation_periods')
    .select('id, status')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (existing?.status === 'closed') {
    return { error: `Period ${year}-${String(month).padStart(2, '0')} is already closed` };
  }

  // Aggregate donation totals for this period
  const { data: donations } = await admin
    .from('donations')
    .select('id, amount_pence, appeal_id')
    .eq('organisation_id', organisation_id)
    .gte('transaction_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('transaction_date', lastDayOfMonth(year, month));

  const donationList = donations ?? [];
  const donation_count = donationList.length;
  const total_pence = donationList.reduce((sum, d: { amount_pence: number }) => sum + d.amount_pence, 0);

  // Build appeal summary
  const appealTotals = new Map<string, { count: number; total_pence: number }>();
  for (const d of donationList) {
    if (d.appeal_id) {
      const prev = appealTotals.get(d.appeal_id) ?? { count: 0, total_pence: 0 };
      appealTotals.set(d.appeal_id, {
        count: prev.count + 1,
        total_pence: prev.total_pence + d.amount_pence,
      });
    }
  }

  let summary_by_appeal: AppealSummary[] = [];
  if (appealTotals.size > 0) {
    const appealIds = Array.from(appealTotals.keys());
    const { data: appeals } = await admin
      .from('appeals')
      .select('id, code, name')
      .in('id', appealIds);

    summary_by_appeal = (appeals ?? []).map((a: { id: string; code: string; name: string }) => ({
      appeal_id: a.id,
      appeal_code: a.code,
      appeal_name: a.name,
      count: appealTotals.get(a.id)?.count ?? 0,
      total_pence: appealTotals.get(a.id)?.total_pence ?? 0,
    }));
  }

  const periodData = {
    organisation_id,
    year,
    month,
    status: 'closed' as const,
    donation_count,
    total_pence,
    summary_by_appeal,
    closed_by: actorId,
    closed_at: new Date().toISOString(),
  };

  let period: ReconciliationPeriod;

  if (existing) {
    const { data, error } = await admin
      .from('reconciliation_periods')
      .update(periodData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? 'Failed to close period' };
    period = data;
  } else {
    const { data, error } = await admin
      .from('reconciliation_periods')
      .insert(periodData)
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? 'Failed to close period' };
    period = data;
  }

  // Mark all donations in this period as reconciled
  if (donation_count > 0) {
    await admin
      .from('donations')
      .update({ status: 'reconciled' })
      .eq('organisation_id', organisation_id)
      .gte('transaction_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('transaction_date', lastDayOfMonth(year, month))
      .neq('status', 'reconciled');
  }

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'reconciliation.period_closed',
    entity_type: 'reconciliation_period',
    entity_id: period.id,
    new_data: { year, month, donation_count, total_pence },
  });

  return { data: period };
}

export async function getPeriod(
  input: GetPeriodInput
): Promise<ActionResult<ReconciliationPeriod | null>> {
  const parsed = getPeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, year, month } = parsed.data;

  const actorId = await requireRole(organisation_id, RECON_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reconciliation_periods')
    .select('*')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: data ?? null };
}

export async function listPeriods(
  organisation_id: string
): Promise<ActionResult<ReconciliationPeriod[]>> {
  if (!organisation_id) return { error: 'Organisation ID required' };

  const actorId = await requireRole(organisation_id, RECON_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reconciliation_periods')
    .select('*')
    .eq('organisation_id', organisation_id)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// Returns the last day of the given month as YYYY-MM-DD
function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0); // day 0 of next month = last day of this month
  return d.toISOString().split('T')[0];
}
