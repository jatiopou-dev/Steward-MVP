# M1 — Secure Foundation Design Spec

**Date:** 2026-06-18  
**Milestone:** M1 — Secure Foundation  
**Status:** Approved for implementation

---

## What we are building

The multi-tenant security layer for Steward. After M1, a user can belong to an organisation, and users cannot access another organisation's data. Role checks exist server-side on every sensitive action.

This is the bedrock every later milestone sits on. Nothing in M2–M7 is safe without this.

---

## Scope

M1 covers:

1. New Supabase migrations (007–010) alongside existing prototype schema
2. RLS helper functions (`is_org_member`, `has_org_role`)
3. RLS policies on all new tables
4. TypeScript types for all new entities
5. Server actions (v2) for organisations, memberships, and audit logging
6. Zod validation schemas

M1 does **not** touch existing migrations 001–006 or existing actions (`organizations.ts`, `transactions.ts`, `members.ts`, `funds.ts`, `giving.ts`). The prototype keeps working throughout.

---

## Architecture

### Option chosen: Option B — greenfield alongside prototype

New tables live in the same Supabase project. They use the architecture-bible names and schema. The existing `organizations` table (US spelling, prototype schema) is untouched.

New actions live in `src/app/actions/v2/` to avoid collision.

When M2 wires the dashboard to real data, it will switch components to use the v2 actions. The prototype routes (`/demo`) continue to use the old context system.

---

## Backend Impact Check

```
Backend Impact Check:
- Business rule: Users access data only through active membership in an organisation. Role determines what they can mutate.
- Tables affected: profiles (extend), organisations (new), memberships (new), audit_logs (new)
- Tenant boundary: organisation_id on every new tenant-owned table
- Roles affected: owner, admin, finance_manager, finance_assistant, viewer, auditor
- RLS affected: all four new tables get RLS enabled + policies
- Audit log required: role changes, org creation, membership invite/remove
- Stripe/payment impact: none in M1
- Migration required: yes — migrations 007–010
- Tests required: RLS isolation tests (user A cannot read user B's org data), role check tests for server actions
- Risk level: HIGH — this is the security foundation; get it wrong and every later feature is compromised
```

---

## Schema

### Migration 007 — Foundation tables

**`profiles` (extend existing)**

The Supabase Auth trigger already creates a row in `profiles` when a user signs up (added in earlier prototype migrations). Migration 007 ensures the `updated_at` column exists and adds no breaking changes.

```sql
alter table profiles
  add column if not exists updated_at timestamptz not null default now();
```

**`organisations`**

New table. UK spelling. Supports hierarchical structure (denomination → network → church).

```sql
create table organisations (
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
```

**`memberships`**

Joins users to organisations with a role. One user can belong to many orgs. One org has many members.

```sql
create table memberships (
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

### Migration 008 — RLS helper functions

Security-definer functions so RLS policies are readable and fast.

```sql
create or replace function public.is_org_member(org_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;
```

### Migration 009 — RLS policies

Enable RLS and create policies for `organisations`, `memberships`, `profiles`.

**`profiles`** — user sees only their own row:
```sql
alter table profiles enable row level security;

create policy "users can view own profile"
on profiles for select using (id = auth.uid());

create policy "users can update own profile"
on profiles for update using (id = auth.uid()) with check (id = auth.uid());
```

**`organisations`** — visible if member:
```sql
alter table organisations enable row level security;

create policy "members can view org"
on organisations for select using (public.is_org_member(id));

create policy "owners and admins can update org"
on organisations for update
using (public.has_org_role(id, array['owner','admin']))
with check (public.has_org_role(id, array['owner','admin']));
```

Insert is done server-side via service role (org creation bootstraps the first membership).

**`memberships`** — visible to all members; mutations server-side only:
```sql
alter table memberships enable row level security;

create policy "members can view memberships in their org"
on memberships for select using (public.is_org_member(organisation_id));
```

All membership inserts/updates/deletes go through server actions with service role client — no client-side RLS insert policy needed.

### Migration 010 — Audit logs

```sql
create table audit_logs (
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

create policy "owners admins finance_managers auditors can view audit logs"
on audit_logs for select using (
  public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor'])
);

-- Indexes
create index idx_memberships_user_id on memberships(user_id);
create index idx_memberships_org_id on memberships(organisation_id);
create index idx_audit_logs_org_id_created_at on audit_logs(organisation_id, created_at desc);
```

Audit log inserts use service-role client only — no RLS insert policy.

---

## TypeScript types

**File:** `src/lib/types/v2.ts`

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
```

---

## Zod validation

**File:** `src/lib/validation/v2.ts`

```ts
import { z } from 'zod';

export const createOrganisationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(['denomination','network','conference','church','ministry']),
  parent_organisation_id: z.string().uuid().optional(),
  country: z.string().length(2).default('GB'),
  currency: z.string().length(3).default('GBP'),
});

export const inviteMemberSchema = z.object({
  organisation_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin','finance_manager','finance_assistant','viewer','auditor']),
});

export const updateMemberRoleSchema = z.object({
  membership_id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  role: z.enum(['admin','finance_manager','finance_assistant','viewer','auditor']),
});
```

---

## Supabase client helpers

**File:** `src/lib/supabase/server.ts` — already exists (prototype). Exports `createServerClient` using `@supabase/ssr` with cookie store from `next/headers`. Used for anon-key reads (RLS enforced).

**File:** `src/lib/supabase/admin.ts` — new. Exports `createAdminClient` using service role key from env `SUPABASE_SERVICE_ROLE_KEY`. Called only inside server actions for writes that must bypass RLS (org creation, membership bootstrap, audit inserts). Never imported in client components.

---

## Server actions

### `src/app/actions/v2/organisations.ts`

Uses Supabase SSR server client (anon key for reads, service role for writes that bootstrap membership).

- `createOrganisation(data)` — validate → create org row (service role) → create owner membership → write audit log → return org
- `getOrganisation(orgId)` — validate user is member → return org row
- `listUserOrganisations()` — query memberships for `auth.uid()` → return orgs

### `src/app/actions/v2/memberships.ts`

- `inviteUser(data)` — caller must be owner/admin → validate → upsert membership with status='invited' → audit log
- `activateMembership(membershipId)` — called when invited user accepts → set status='active' → audit log
- `updateMemberRole(data)` — caller must be owner/admin → cannot demote self → update role → audit log
- `removeMember(membershipId, orgId)` — caller must be owner/admin → cannot remove self if sole owner → set status='disabled' → audit log
- `listMembers(orgId)` — caller must be member → return memberships

### `src/app/actions/v2/audit.ts`

- `createAuditLog(entry)` — internal helper, service role only — not exported as a public action. Used internally by other actions.

---

## Security rules

1. Server actions create a Supabase SSR client using `createServerClient` from `@supabase/ssr`.
2. Service-role client used only for writes that need to bypass RLS (org creation, membership bootstrapping, audit log inserts). Never exposed to client.
3. Every action that mutates data first verifies the caller's membership and role via `has_org_role()` query — not trusting any client-supplied claim.
4. `organisation_id` in any action must be cross-checked against the caller's memberships. Passing a random UUID should return 403, not 500.

---

## What M1 does NOT include

- No invitation email sending (that is an M2+ concern)
- No org switcher UI (demo only for now; real UI comes in M2)
- No Stripe billing (M7)
- No changes to `/demo` routes or existing prototype tables

---

## Exit criteria (from roadmap)

- [ ] User can belong to an organisation (membership row exists, `is_org_member` returns true)
- [ ] Users cannot access other organisations' data (RLS blocks cross-org reads in Supabase SQL editor test)
- [ ] Role checks enforced server-side in every action
- [ ] Audit log written on: org create, member invite, member role change, member remove
