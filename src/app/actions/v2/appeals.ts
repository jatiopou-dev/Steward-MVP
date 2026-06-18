'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createAppealSchema,
  updateAppealSchema,
  type CreateAppealInput,
  type UpdateAppealInput,
} from '@/lib/validation/v2';
import type { Appeal, ActionResult, MemberRole } from '@/lib/types/v2';
import { createAuditLog } from './audit';

const FINANCE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];

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

export async function createAppeal(
  input: CreateAppealInput
): Promise<ActionResult<Appeal>> {
  const parsed = createAppealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, FINANCE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('appeals')
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create appeal' };

  await createAuditLog({
    organisation_id: parsed.data.organisation_id,
    actor_user_id: actorId,
    action: 'appeal.created',
    entity_type: 'appeal',
    entity_id: data.id,
    new_data: { code: data.code, name: data.name },
  });

  return { data };
}

export async function getAppeal(
  id: string,
  orgId: string
): Promise<ActionResult<Appeal>> {
  if (!id || !orgId) return { error: 'ID and organisation ID required' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('appeals')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (error || !data) return { error: 'Appeal not found or access denied' };
  return { data };
}

export async function listAppeals(
  orgId: string,
  status?: 'active' | 'archived'
): Promise<ActionResult<Appeal[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  let query = supabase
    .from('appeals')
    .select('*')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function updateAppeal(
  input: UpdateAppealInput
): Promise<ActionResult<Appeal>> {
  const parsed = updateAppealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, FINANCE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  const { data: current } = await admin
    .from('appeals')
    .select('name, description, external_account_code')
    .eq('id', parsed.data.id)
    .eq('organisation_id', parsed.data.organisation_id)
    .single();

  if (!current) return { error: 'Appeal not found' };

  const { id, organisation_id, ...updates } = parsed.data;

  const { data, error } = await admin
    .from('appeals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', organisation_id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to update appeal' };

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'appeal.updated',
    entity_type: 'appeal',
    entity_id: id,
    previous_data: current,
    new_data: updates,
  });

  return { data };
}

export async function archiveAppeal(
  id: string,
  orgId: string
): Promise<ActionResult<void>> {
  if (!id || !orgId) return { error: 'ID and organisation ID required' };

  const actorId = await requireRole(orgId, FINANCE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('appeals')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId);

  if (error) return { error: error.message };

  await createAuditLog({
    organisation_id: orgId,
    actor_user_id: actorId,
    action: 'appeal.archived',
    entity_type: 'appeal',
    entity_id: id,
    new_data: { status: 'archived' },
  });

  return { data: undefined as void };
}
