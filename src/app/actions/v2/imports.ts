'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createImportBatchSchema,
  importDonationsSchema,
  listDonationsSchema,
  type CreateImportBatchInput,
  type ImportDonationsInput,
  type ListDonationsInput,
} from '@/lib/validation/v2';
import type {
  DonationImportBatch,
  Donation,
  ImportBatchResult,
  ImportRowResult,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';

const IMPORT_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
const IMPORT_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

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

export async function createImportBatch(
  input: CreateImportBatchInput
): Promise<ActionResult<DonationImportBatch>> {
  const parsed = createImportBatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, IMPORT_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('donation_import_batches')
    .insert({ ...parsed.data, created_by: actorId })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create import batch' };

  return { data };
}

export async function importDonations(
  input: ImportDonationsInput
): Promise<ActionResult<ImportBatchResult>> {
  const parsed = importDonationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { batch_id, organisation_id, rows } = parsed.data;

  const actorId = await requireRole(organisation_id, IMPORT_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  // Verify batch belongs to this org
  const { data: batch } = await admin
    .from('donation_import_batches')
    .select('id, source')
    .eq('id', batch_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!batch) return { error: 'Import batch not found' };

  // Load appeals and donors for matching
  const [{ data: appeals }, { data: donors }] = await Promise.all([
    admin
      .from('appeals')
      .select('id, code')
      .eq('organisation_id', organisation_id)
      .eq('status', 'active'),
    admin
      .from('donors')
      .select('id, email')
      .eq('organisation_id', organisation_id)
      .eq('status', 'active'),
  ]);

  const appealByCode = new Map<string, string>(
    (appeals ?? []).map((a: { id: string; code: string }) => [a.code, a.id])
  );
  const donorByEmail = new Map<string, string>(
    (donors ?? [])
      .filter((d: { id: string; email: string | null }) => d.email)
      .map((d: { id: string; email: string | null }) => [d.email!, d.id])
  );

  let imported_count = 0;
  let skipped_count = 0;
  let error_count = 0;
  const rowResults: ImportRowResult[] = [];

  for (const row of rows) {
    const appeal_id = row.appeal_code ? (appealByCode.get(row.appeal_code) ?? null) : null;
    const donor_id = row.donor_email ? (donorByEmail.get(row.donor_email) ?? null) : null;

    const { error: insertError } = await admin.from('donations').insert({
      organisation_id,
      import_batch_id: batch_id,
      source: batch.source,
      source_reference: row.source_reference,
      amount_pence: row.amount_pence,
      currency: 'GBP',
      transaction_date: row.transaction_date,
      description: row.description ?? null,
      raw_row: row.raw_row,
      appeal_id,
      donor_id,
      status: appeal_id || donor_id ? 'matched' : 'imported',
    });

    if (insertError) {
      if (insertError.code === '23505') {
        skipped_count++;
        rowResults.push({ source_reference: row.source_reference, status: 'skipped' });
      } else {
        error_count++;
        rowResults.push({
          source_reference: row.source_reference,
          status: 'error',
          error: insertError.message,
        });
      }
    } else {
      imported_count++;
      rowResults.push({ source_reference: row.source_reference, status: 'imported' });
    }
  }

  // Update batch counts and mark complete
  await admin
    .from('donation_import_batches')
    .update({
      row_count: rows.length,
      imported_count,
      skipped_count,
      error_count,
      status: error_count === rows.length ? 'failed' : 'complete',
    })
    .eq('id', batch_id);

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'import.completed',
    entity_type: 'donation_import_batch',
    entity_id: batch_id,
    new_data: { imported_count, skipped_count, error_count },
  });

  return {
    data: {
      batch_id,
      imported_count,
      skipped_count,
      error_count,
      rows: rowResults,
    },
  };
}

export async function listImportBatches(
  orgId: string
): Promise<ActionResult<DonationImportBatch[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const actorId = await requireRole(orgId, IMPORT_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('donation_import_batches')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function listDonations(
  input: ListDonationsInput
): Promise<ActionResult<Donation[]>> {
  const parsed = listDonationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, appeal_id, batch_id, date_from, date_to } = parsed.data;

  const actorId = await requireRole(organisation_id, IMPORT_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  let query = supabase
    .from('donations')
    .select('*')
    .eq('organisation_id', organisation_id)
    .order('transaction_date', { ascending: false });

  if (appeal_id) query = query.eq('appeal_id', appeal_id);
  if (batch_id) query = query.eq('import_batch_id', batch_id);
  if (date_from) query = query.gte('transaction_date', date_from);
  if (date_to) query = query.lte('transaction_date', date_to);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}
