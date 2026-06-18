'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type RemoveMemberInput,
} from '@/lib/validation/v2';
import type { Membership, ActionResult, MemberRole } from '@/lib/types/v2';
import { createAuditLog } from './audit';

/** Verify caller has one of the given roles in orgId. Returns user.id or null. */
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

export async function inviteUser(
  input: InviteMemberInput
): Promise<ActionResult<Membership>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, ['owner', 'admin']);
  if (!actorId) return { error: 'Permission denied: owner or admin required' };

  // Look up user by email via admin client (auth.users not accessible via anon)
  const admin = createAdminClient();
  const { data: userList, error: userError } = await admin.auth.admin.listUsers();
  if (userError) return { error: 'Could not resolve user' };

  const target = userList.users.find((u) => u.email === parsed.data.email);
  if (!target) return { error: 'No account found for that email address' };

  const { data, error } = await admin
    .from('memberships')
    .upsert({
      user_id: target.id,
      organisation_id: parsed.data.organisation_id,
      role: parsed.data.role,
      status: 'invited',
      invited_by: actorId,
    }, { onConflict: 'user_id,organisation_id' })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to invite user' };

  await createAuditLog({
    organisation_id: parsed.data.organisation_id,
    actor_user_id: actorId,
    action: 'membership.invited',
    entity_type: 'membership',
    entity_id: data.id,
    new_data: { email: parsed.data.email, role: parsed.data.role },
  });

  return { data };
}

export async function activateMembership(membershipId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  // Fetch the membership to confirm it belongs to this user
  const { data: membership, error: fetchError } = await admin
    .from('memberships')
    .select('*')
    .eq('id', membershipId)
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .single();

  if (fetchError || !membership) return { error: 'Invitation not found' };

  const { error } = await admin
    .from('memberships')
    .update({ status: 'active' })
    .eq('id', membershipId);

  if (error) return { error: error.message };

  await createAuditLog({
    organisation_id: membership.organisation_id,
    actor_user_id: user.id,
    action: 'membership.activated',
    entity_type: 'membership',
    entity_id: membershipId,
  });

  return {};
}

export async function updateMemberRole(
  input: UpdateMemberRoleInput
): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, ['owner', 'admin']);
  if (!actorId) return { error: 'Permission denied: owner or admin required' };

  const admin = createAdminClient();

  // Fetch current state for audit log
  const { data: current } = await admin
    .from('memberships')
    .select('role, user_id')
    .eq('id', parsed.data.membership_id)
    .eq('organisation_id', parsed.data.organisation_id)
    .single();

  if (!current) return { error: 'Membership not found' };

  // Prevent actor from changing their own role (owner self-demotion protection)
  if (current.user_id === actorId) {
    return { error: 'Cannot change your own role' };
  }

  const { error } = await admin
    .from('memberships')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.membership_id)
    .eq('organisation_id', parsed.data.organisation_id);

  if (error) return { error: error.message };

  await createAuditLog({
    organisation_id: parsed.data.organisation_id,
    actor_user_id: actorId,
    action: 'membership.role_changed',
    entity_type: 'membership',
    entity_id: parsed.data.membership_id,
    previous_data: { role: current.role },
    new_data: { role: parsed.data.role },
  });

  return {};
}

export async function removeMember(
  input: RemoveMemberInput
): Promise<ActionResult> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, ['owner', 'admin']);
  if (!actorId) return { error: 'Permission denied: owner or admin required' };

  const admin = createAdminClient();

  const { data: current } = await admin
    .from('memberships')
    .select('user_id, role')
    .eq('id', parsed.data.membership_id)
    .eq('organisation_id', parsed.data.organisation_id)
    .single();

  if (!current) return { error: 'Membership not found' };
  if (current.user_id === actorId) return { error: 'Cannot remove yourself' };

  const { error } = await admin
    .from('memberships')
    .update({ status: 'disabled' })
    .eq('id', parsed.data.membership_id);

  if (error) return { error: error.message };

  await createAuditLog({
    organisation_id: parsed.data.organisation_id,
    actor_user_id: actorId,
    action: 'membership.removed',
    entity_type: 'membership',
    entity_id: parsed.data.membership_id,
    previous_data: { role: current.role },
  });

  return {};
}

export async function listMembers(
  orgId: string
): Promise<ActionResult<Membership[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // RLS enforces is_org_member check on memberships table
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };

  return { data: data ?? [] };
}
