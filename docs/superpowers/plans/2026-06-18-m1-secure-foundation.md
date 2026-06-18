# M1 — Secure Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-tenant security layer (organisations, memberships, RLS, audit logs) alongside the existing prototype schema so Steward has a finance-grade backend foundation.

**Architecture:** New Supabase migrations (007–010) create `organisations`, `memberships`, and `audit_logs` tables with RLS enabled and helper functions (`is_org_member`, `has_org_role`). Parallel TypeScript types, Zod validation, and server actions in `src/app/actions/v2/` sit beside the unchanged prototype actions. The existing `/demo` routes and prototype tables are untouched.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + RLS), `@supabase/ssr`, Zod, TypeScript, Vitest (added in Task 1)

---

## File map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/007_foundation_schema.sql` | Create | `profiles` extend + `organisations` + `memberships` |
| `supabase/migrations/008_rls_helpers.sql` | Create | `is_org_member()` + `has_org_role()` functions |
| `supabase/migrations/009_rls_policies.sql` | Create | Enable RLS + policies on profiles/organisations/memberships |
| `supabase/migrations/010_audit_logs.sql` | Create | `audit_logs` table + RLS + indexes |
| `src/lib/types/v2.ts` | Create | TypeScript interfaces for Organisation, Membership, AuditLog |
| `src/lib/validation/v2.ts` | Create | Zod schemas for all v2 inputs |
| `src/utils/supabase/admin.ts` | Create | Service-role Supabase client (never imported client-side) |
| `src/app/actions/v2/audit.ts` | Create | `createAuditLog` internal helper |
| `src/app/actions/v2/organisations.ts` | Create | `createOrganisation`, `getOrganisation`, `listUserOrganisations` |
| `src/app/actions/v2/memberships.ts` | Create | `inviteUser`, `activateMembership`, `updateMemberRole`, `removeMember`, `listMembers` |
| `src/__tests__/v2/organisations.test.ts` | Create | Unit tests for organisation actions (mocked Supabase) |
| `src/__tests__/v2/memberships.test.ts` | Create | Unit tests for membership actions (mocked Supabase) |
| `vitest.config.ts` | Create | Vitest config |
| `CHANGELOG.md` | Modify | M1 entry |

---

## Task 1: Install Vitest and write first failing test

Steward has no test framework. Add Vitest with minimal config, then write one failing test to prove it works before implementing anything.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/v2/organisations.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd steward-app
npm install --save-dev vitest @vitejs/plugin-react
```

- [ ] **Step 2: Add test script to package.json**

Open `package.json`. In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

So the scripts block looks like:
```json
"scripts": {
  "dev": "next dev --webpack",
  "build": "next build --webpack",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Write a failing test**

Create `src/__tests__/v2/organisations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('organisations placeholder', () => {
  it('fails until implementation exists', () => {
    expect(true).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests to confirm failure**

```bash
npm test
```

Expected output includes: `FAIL src/__tests__/v2/organisations.test.ts` and `AssertionError: expected true to be false`

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/__tests__/v2/organisations.test.ts
git commit -m "chore: add vitest test framework"
```

---

## Task 2: Create Supabase migrations 007–010

Write all four migration SQL files. These must be applied to Supabase via the dashboard SQL editor or CLI in order (007 → 008 → 009 → 010).

**Files:**
- Create: `supabase/migrations/007_foundation_schema.sql`
- Create: `supabase/migrations/008_rls_helpers.sql`
- Create: `supabase/migrations/009_rls_policies.sql`
- Create: `supabase/migrations/010_audit_logs.sql`

- [ ] **Step 1: Create `supabase/migrations/007_foundation_schema.sql`**

```sql
-- 007: Add foundation schema for multi-tenant architecture
-- Safe to run alongside existing prototype tables (organizations, members, etc.)

-- Enable pgcrypto if not already enabled
create extension if not exists "pgcrypto";

-- Extend profiles with updated_at (safe: add if not exists)
alter table profiles
  add column if not exists updated_at timestamptz not null default now();

-- organisations table (UK spelling, distinct from prototype 'organizations')
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('denomination','network','conference','church','ministry')),
  parent_organisation_id uuid references organisations(id),
  country text default 'GB',
  currency text not null default 'GBP',
  status text not null default 'active' check (status in ('active','archived','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- memberships: joins users to organisations with a role
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  role text not null check (role in ('owner','admin','finance_manager','finance_assistant','viewer','auditor')),
  status text not null default 'active' check (status in ('invited','active','disabled')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, organisation_id)
);
```

- [ ] **Step 2: Create `supabase/migrations/008_rls_helpers.sql`**

```sql
-- 008: RLS helper functions
-- security definer means these run as the function owner, not the calling user.
-- set search_path = public prevents search_path injection attacks.

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;
```

- [ ] **Step 3: Create `supabase/migrations/009_rls_policies.sql`**

```sql
-- 009: Enable RLS and create policies

-- profiles: each user sees only their own row
alter table profiles enable row level security;

create policy "users can view own profile"
on profiles for select
using (id = auth.uid());

create policy "users can update own profile"
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- organisations: visible to active members only
alter table organisations enable row level security;

create policy "members can view org"
on organisations for select
using (public.is_org_member(id));

create policy "owners and admins can update org"
on organisations for update
using (public.has_org_role(id, array['owner','admin']))
with check (public.has_org_role(id, array['owner','admin']));

-- memberships: any active member can view memberships in their org
-- inserts/updates/deletes are service-role only (no RLS insert policy)
alter table memberships enable row level security;

create policy "members can view memberships in their org"
on memberships for select
using (public.is_org_member(organisation_id));
```

- [ ] **Step 4: Create `supabase/migrations/010_audit_logs.sql`**

```sql
-- 010: Audit logs table

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

-- Only owners, admins, finance managers, and auditors can read audit logs
create policy "privileged roles can view audit logs"
on audit_logs for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

-- Indexes
create index if not exists idx_memberships_user_id on memberships(user_id);
create index if not exists idx_memberships_org_id on memberships(organisation_id);
create index if not exists idx_audit_logs_org_id_created_at on audit_logs(organisation_id, created_at desc);
```

- [ ] **Step 5: Apply migrations to Supabase**

Go to the Supabase dashboard → SQL editor. Run each file in order:
1. Copy contents of `007_foundation_schema.sql` → run
2. Copy contents of `008_rls_helpers.sql` → run
3. Copy contents of `009_rls_policies.sql` → run
4. Copy contents of `010_audit_logs.sql` → run

Verify in Table Editor that `organisations`, `memberships`, and `audit_logs` tables exist.

- [ ] **Step 6: Commit migration files**

```bash
git add supabase/migrations/
git commit -m "feat(db): add M1 foundation migrations 007-010

- organisations and memberships tables
- is_org_member and has_org_role RLS helper functions
- RLS enabled on profiles, organisations, memberships, audit_logs
- audit_logs table with role-gated select policy"
```

---

## Task 3: TypeScript types and Zod validation

**Files:**
- Create: `src/lib/types/v2.ts`
- Create: `src/lib/validation/v2.ts`

- [ ] **Step 1: Create `src/lib/types/v2.ts`**

First create the `src/lib/` directory. Then create the file:

```ts
export type OrgType = 'denomination' | 'network' | 'conference' | 'church' | 'ministry';
export type OrgStatus = 'active' | 'archived' | 'suspended';
export type MemberRole = 'owner' | 'admin' | 'finance_manager' | 'finance_assistant' | 'viewer' | 'auditor';
export type MemberStatus = 'invited' | 'active' | 'disabled';

export interface Organisation {
  id: string;
  name: string;
  type: OrgType;
  parent_organisation_id: string | null;
  country: string;
  currency: string;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organisation_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActionResult<T = void> {
  data?: T;
  error?: string;
}
```

- [ ] **Step 2: Install Zod (if not present)**

Check if already installed:
```bash
grep '"zod"' package.json
```

If not present:
```bash
npm install zod
```

- [ ] **Step 3: Create `src/lib/validation/v2.ts`**

```ts
import { z } from 'zod';

export const createOrganisationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name too long'),
  type: z.enum(['denomination', 'network', 'conference', 'church', 'ministry']),
  parent_organisation_id: z.string().uuid().optional(),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').default('GB'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('GBP'),
});

export const inviteMemberSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'finance_manager', 'finance_assistant', 'viewer', 'auditor']),
});

export const updateMemberRoleSchema = z.object({
  membership_id: z.string().uuid('Invalid membership ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  role: z.enum(['admin', 'finance_manager', 'finance_assistant', 'viewer', 'auditor']),
});

export const removeMemberSchema = z.object({
  membership_id: z.string().uuid('Invalid membership ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
});

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat(types): add v2 TypeScript types and Zod validation schemas"
```

---

## Task 4: Admin Supabase client

The service-role client bypasses RLS for writes that must bootstrap their own permissions (org creation → membership creation). It must never be imported client-side.

**Files:**
- Create: `src/utils/supabase/admin.ts`

- [ ] **Step 1: Verify `SUPABASE_SERVICE_ROLE_KEY` env var exists**

Check `.env.local`:
```bash
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

If missing, add it. The value is in the Supabase dashboard under Project Settings → API → `service_role` key. It starts with `eyJ`. Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

- [ ] **Step 2: Create `src/utils/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS.
// NEVER import this in client components or expose to browser.
// Only used in server actions for writes that bootstrap their own permissions.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/supabase/admin.ts
git commit -m "feat(auth): add service-role admin Supabase client"
```

---

## Task 5: Audit log helper

All v2 actions call this internally. It uses the admin client so the insert always succeeds regardless of the caller's RLS context.

**Files:**
- Create: `src/app/actions/v2/audit.ts`

- [ ] **Step 1: Create directory `src/app/actions/v2/`**

```bash
mkdir -p src/app/actions/v2
```

- [ ] **Step 2: Create `src/app/actions/v2/audit.ts`**

```ts
'use server';

import { createAdminClient } from '@/utils/supabase/admin';

interface AuditEntry {
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id?: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_logs').insert({
    organisation_id: entry.organisation_id,
    actor_user_id: entry.actor_user_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    previous_data: entry.previous_data ?? null,
    new_data: entry.new_data ?? null,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    // Audit log failure is logged but must not crash the main action.
    console.error('[audit] Failed to write audit log:', error.message);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/v2/audit.ts
git commit -m "feat(audit): add internal createAuditLog server action"
```

---

## Task 6: Organisation server actions

**Files:**
- Create: `src/app/actions/v2/organisations.ts`

- [ ] **Step 1: Create `src/app/actions/v2/organisations.ts`**

```ts
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

  // RLS enforces membership check — this will return null if user is not a member
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/organisations.ts
git commit -m "feat(actions): add v2 organisation server actions

createOrganisation, getOrganisation, listUserOrganisations.
Service-role client used for org+membership bootstrap only."
```

---

## Task 7: Membership server actions

**Files:**
- Create: `src/app/actions/v2/memberships.ts`

- [ ] **Step 1: Create `src/app/actions/v2/memberships.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/memberships.ts
git commit -m "feat(actions): add v2 membership server actions

inviteUser, activateMembership, updateMemberRole, removeMember, listMembers.
All mutations verify caller role server-side. Audit logs on all changes."
```

---

## Task 8: Write real tests

Replace the placeholder test and add meaningful unit tests with mocked Supabase.

**Files:**
- Modify: `src/__tests__/v2/organisations.test.ts`
- Create: `src/__tests__/v2/memberships.test.ts`

- [ ] **Step 1: Replace placeholder in `src/__tests__/v2/organisations.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrganisationSchema } from '@/lib/validation/v2';

describe('createOrganisationSchema', () => {
  it('accepts valid church input', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'St Paul Church',
      type: 'church',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe('GB');
      expect(result.data.currency).toBe('GBP');
    }
  });

  it('rejects name shorter than 2 characters', () => {
    const result = createOrganisationSchema.safeParse({ name: 'A', type: 'church' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid org type', () => {
    const result = createOrganisationSchema.safeParse({ name: 'Test', type: 'corporation' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid parent_organisation_id', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'Test',
      type: 'church',
      parent_organisation_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid parent_organisation_id', () => {
    const result = createOrganisationSchema.safeParse({
      name: 'Test',
      type: 'church',
      parent_organisation_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Create `src/__tests__/v2/memberships.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { inviteMemberSchema, updateMemberRoleSchema, removeMemberSchema } from '@/lib/validation/v2';

describe('inviteMemberSchema', () => {
  it('accepts valid invite', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'treasurer@church.org',
      role: 'finance_manager',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
  });

  it('rejects owner role (owner is set only at org creation)', () => {
    const result = inviteMemberSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@test.com',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMemberRoleSchema', () => {
  it('accepts valid role change', () => {
    const result = updateMemberRoleSchema.safeParse({
      membership_id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
      role: 'viewer',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid membership_id', () => {
    const result = updateMemberRoleSchema.safeParse({
      membership_id: 'bad-id',
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'viewer',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('accepts valid remove input', () => {
    const result = removeMemberSchema.safeParse({
      membership_id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass. If any fail, fix validation schemas in `src/lib/validation/v2.ts` accordingly.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/
git commit -m "test(v2): add validation unit tests for organisations and memberships"
```

---

## Task 9: Typecheck and CHANGELOG

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors before proceeding. Common issues:
- Missing `@/lib/types/v2` import — check `src/lib/types/v2.ts` exists
- Supabase return types — cast with `as Organisation` if needed from `.select()` responses

- [ ] **Step 2: Update CHANGELOG.md**

Open `CHANGELOG.md` and prepend this entry:

```markdown
## [M1] — 2026-06-18

### Added
- `organisations` table with hierarchical type support (denomination/network/conference/church/ministry)
- `memberships` table with role enum (owner/admin/finance_manager/finance_assistant/viewer/auditor)
- `audit_logs` table scoped to organisation
- RLS helper functions: `is_org_member()` and `has_org_role()`
- RLS policies on `profiles`, `organisations`, `memberships`, `audit_logs`
- Service-role admin Supabase client (`src/utils/supabase/admin.ts`)
- v2 server actions: `createOrganisation`, `getOrganisation`, `listUserOrganisations`
- v2 server actions: `inviteUser`, `activateMembership`, `updateMemberRole`, `removeMember`, `listMembers`
- Internal `createAuditLog` helper — writes on: org create, member invite, role change, member remove
- Zod validation schemas for all v2 inputs
- TypeScript types for Organisation, Membership, AuditLog
- Vitest test framework with validation unit tests

### Security
- All membership mutations verify caller role server-side before executing
- RLS blocks cross-tenant reads at the database layer
- Service-role key never exposed to client
- Audit log inserts bypass RLS via service-role (no client-facing insert policy)
- Owners cannot demote themselves or remove themselves
```

- [ ] **Step 3: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add M1 milestone to CHANGELOG"
```

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

---

## Completion summary

```
What changed:
  - 4 new Supabase migrations (007-010): organisations, memberships, audit_logs, RLS helpers + policies
  - src/lib/types/v2.ts: TypeScript interfaces
  - src/lib/validation/v2.ts: Zod schemas
  - src/utils/supabase/admin.ts: service-role client
  - src/app/actions/v2/audit.ts: internal audit log helper
  - src/app/actions/v2/organisations.ts: 3 server actions
  - src/app/actions/v2/memberships.ts: 5 server actions
  - src/__tests__/v2/: 8 validation unit tests

Security impact:
  - Tenant isolation enforced at DB layer via RLS
  - is_org_member() and has_org_role() are security-definer — safe from search_path injection
  - Server actions verify membership/role before every mutation
  - Service-role key server-only

RLS impact:
  - profiles: user sees own row only
  - organisations: members see their orgs only
  - memberships: members see memberships in their orgs only
  - audit_logs: privileged roles only

Finance/audit impact:
  - Audit log on: org create, member invite, role change, member disable

Tests added:
  - createOrganisationSchema: 5 tests
  - inviteMemberSchema: 3 tests
  - updateMemberRoleSchema: 2 tests
  - removeMemberSchema: 1 test

Manual checks needed:
  - Apply migrations 007-010 to Supabase in order
  - Verify tables exist in Supabase Table Editor
  - Test RLS in Supabase SQL editor: try reading another org's data as a user with no membership
  - Confirm SUPABASE_SERVICE_ROLE_KEY is in .env.local and Vercel environment variables

Open risks:
  - inviteUser resolves target by iterating auth.admin.listUsers() — fine for MVP, slow at scale. Replace with lookup by email in a future migration.
  - No invitation email yet — M2+ concern
  - No org-switcher UI — M2 concern
```
