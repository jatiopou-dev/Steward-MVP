'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  type CreateBankAccountInput,
  type UpdateBankAccountInput,
} from '@/lib/validation/v2';
import type { BankAccount, ActionResult, MemberRole } from '@/lib/types/v2';

const BANK_ADMIN_ROLES: MemberRole[] = ['owner', 'admin'];
const BANK_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

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

export async function createBankAccount(
  input: CreateBankAccountInput
): Promise<ActionResult<BankAccount>> {
  const parsed = createBankAccountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, BANK_ADMIN_ROLES);
  if (!actorId) return { error: 'Permission denied: owner or admin required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bank_accounts')
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create bank account' };

  return { data };
}

export async function listBankAccounts(
  orgId: string
): Promise<ActionResult<BankAccount[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const actorId = await requireRole(orgId, BANK_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function updateBankAccount(
  input: UpdateBankAccountInput
): Promise<ActionResult<BankAccount>> {
  const parsed = updateBankAccountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, BANK_ADMIN_ROLES);
  if (!actorId) return { error: 'Permission denied: owner or admin required' };

  const admin = createAdminClient();
  const { id, organisation_id, ...updates } = parsed.data;

  const { data, error } = await admin
    .from('bank_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', organisation_id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to update bank account' };

  return { data };
}
