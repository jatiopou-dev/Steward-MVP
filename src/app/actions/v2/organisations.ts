'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createOrganisationSchema, type CreateOrganisationInput } from '@/lib/validation/v2';
import type { Organisation, ActionResult } from '@/lib/types/v2';
import { createAuditLog } from './audit';

export async function createOrganisation(
  input: CreateOrganisationInput
): Promise<ActionResult<Organisation>> {
  // 1. Validate input
  const parsed = createOrganisationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // 2. Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Not authenticated' };
  }

  // 3. Create org with admin client (no membership exists yet, RLS would block)
  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from('organisations')
    .insert(parsed.data)
    .select()
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? 'Failed to create organisation' };
  }

  // 4. Bootstrap owner membership
  const { error: memberError } = await admin.from('memberships').insert({
    user_id: user.id,
    organisation_id: org.id,
    role: 'owner',
    status: 'active',
  });

  if (memberError) {
    // Clean up org if membership bootstrap fails
    await admin.from('organisations').delete().eq('id', org.id);
    return { error: 'Failed to create owner membership' };
  }

  // 5. Audit log
  await createAuditLog({
    organisation_id: org.id,
    actor_user_id: user.id,
    action: 'org.created',
    entity_type: 'organisation',
    entity_id: org.id,
    new_data: { name: org.name, type: org.type },
  });

  return { data: org };
}

export async function getOrganisation(
  orgId: string
): Promise<ActionResult<Organisation>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Not authenticated' };

  // RLS enforces membership check — returns null if user is not a member
  const { data, error } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error || !data) return { error: 'Organisation not found or access denied' };

  return { data };
}

export async function listUserOrganisations(): Promise<ActionResult<Organisation[]>> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Not authenticated' };

  // Join memberships → organisations for the current user
  const { data, error } = await supabase
    .from('memberships')
    .select('organisations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) return { error: error.message };

  const orgs = (data ?? [])
    .map((row: { organisations: Organisation | Organisation[] | null }) => row.organisations)
    .filter((o): o is Organisation => o !== null && !Array.isArray(o));

  return { data: orgs };
}
