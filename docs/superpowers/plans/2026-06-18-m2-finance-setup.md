# M2 — Finance Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add appeals, donors, and bank_accounts tables with full RLS, server actions, and audit logging so a finance manager can manage finance records and viewers are read-only.

**Architecture:** Three new migrations (011–013) alongside M1 tables. New types and Zod schemas appended to existing v2 files. Three new action files in `src/app/actions/v2/`. Pattern is identical to M1 — anon client for reads (RLS enforced), admin client for writes that need it, `requireRole` helper for server-side permission checks, `createAuditLog` for all mutations.

**Tech Stack:** Supabase Postgres + RLS, Next.js 16 Server Actions, Zod, TypeScript, Vitest

---

## File map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/011_appeals_donors.sql` | Create | appeals + donors tables |
| `supabase/migrations/012_bank_accounts.sql` | Create | bank_accounts table |
| `supabase/migrations/013_m2_rls_policies.sql` | Create | RLS enable + policies + indexes for all 3 tables |
| `src/lib/types/v2.ts` | Modify | Append Appeal, Donor, BankAccount types |
| `src/lib/validation/v2.ts` | Modify | Append appeal/donor/bankAccount Zod schemas |
| `src/app/actions/v2/appeals.ts` | Create | createAppeal, getAppeal, listAppeals, updateAppeal, archiveAppeal |
| `src/app/actions/v2/donors.ts` | Create | createDonor, getDonor, listDonors, updateDonor |
| `src/app/actions/v2/bankAccounts.ts` | Create | createBankAccount, listBankAccounts, updateBankAccount |
| `src/__tests__/v2/finance.test.ts` | Create | Zod schema unit tests for M2 schemas |
| `CHANGELOG.md` | Modify | M2 entry |

---

## Task 1: Migration files 011–013

**Files:**
- Create: `supabase/migrations/011_appeals_donors.sql`
- Create: `supabase/migrations/012_bank_accounts.sql`
- Create: `supabase/migrations/013_m2_rls_policies.sql`

- [ ] **Step 1: Create `supabase/migrations/011_appeals_donors.sql`**

```sql
-- 011: Appeals and donors for M2 Finance Setup

create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  external_account_code text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_appeal_code unique (organisation_id, code)
);

create table if not exists donors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  display_name text not null,
  email text,
  external_reference text,
  gift_aid_eligible boolean default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: Create `supabase/migrations/012_bank_accounts.sql`**

```sql
-- 012: Bank accounts for M2 Finance Setup
-- account_last4 only — never store full account numbers

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  account_last4 text,
  currency text not null default 'GBP',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Create `supabase/migrations/013_m2_rls_policies.sql`**

```sql
-- 013: RLS policies for M2 finance tables
-- Depends on is_org_member() and has_org_role() from migration 008

-- appeals: all members can read; finance_manager+ can mutate
alter table appeals enable row level security;

create policy "members can view appeals"
on appeals for select
using (public.is_org_member(organisation_id));

create policy "finance users can insert appeals"
on appeals for insert
with check (
  public.has_org_role(organisation_id, array['owner','admin','finance_manager'])
);

create policy "finance users can update appeals"
on appeals for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']))
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- donors: restricted read (not viewer-accessible — contains personal data)
alter table donors enable row level security;

create policy "finance members can view donors"
on donors for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant','auditor']
  )
);

create policy "finance users can insert donors"
on donors for insert
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
);

create policy "finance users can update donors"
on donors for update
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
)
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
);

-- bank_accounts: privileged read only
alter table bank_accounts enable row level security;

create policy "finance privileged can view bank accounts"
on bank_accounts for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

create policy "owners and admins can insert bank accounts"
on bank_accounts for insert
with check (
  public.has_org_role(organisation_id, array['owner','admin'])
);

create policy "owners and admins can update bank accounts"
on bank_accounts for update
using (public.has_org_role(organisation_id, array['owner','admin']))
with check (public.has_org_role(organisation_id, array['owner','admin']));

-- Indexes
create index if not exists idx_appeals_org_id on appeals(organisation_id);
create index if not exists idx_appeals_org_status on appeals(organisation_id, status);
create index if not exists idx_donors_org_id on donors(organisation_id);
create index if not exists idx_bank_accounts_org_id on bank_accounts(organisation_id);
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase dashboard → SQL editor. Run each file in order:
1. `011_appeals_donors.sql`
2. `012_bank_accounts.sql`
3. `013_m2_rls_policies.sql`

Verify tables exist in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/011_appeals_donors.sql supabase/migrations/012_bank_accounts.sql supabase/migrations/013_m2_rls_policies.sql
git commit -m "feat(db): add M2 migrations 011-013

- appeals and donors tables with status+archived pattern
- bank_accounts table (account_last4 only, no full account numbers)
- RLS policies: viewers can read appeals, finance roles manage donors,
  only owner/admin manage bank accounts"
```

---

## Task 2: TypeScript types + Zod schemas

**Files:**
- Modify: `src/lib/types/v2.ts`
- Modify: `src/lib/validation/v2.ts`

- [ ] **Step 1: Append types to `src/lib/types/v2.ts`**

At the end of the file, add:

```ts
// M2 Finance types

export type AppealStatus = 'active' | 'archived';
export type DonorStatus = 'active' | 'archived';
export type BankAccountStatus = 'active' | 'archived';

export interface Appeal {
  id: string;
  organisation_id: string;
  code: string;
  name: string;
  description: string | null;
  external_account_code: string | null;
  status: AppealStatus;
  created_at: string;
  updated_at: string;
}

export interface Donor {
  id: string;
  organisation_id: string;
  display_name: string;
  email: string | null;
  external_reference: string | null;
  gift_aid_eligible: boolean;
  status: DonorStatus;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  organisation_id: string;
  name: string;
  account_last4: string | null;
  currency: string;
  status: BankAccountStatus;
  created_at: string;
}
```

- [ ] **Step 2: Append schemas to `src/lib/validation/v2.ts`**

At the end of the file, add:

```ts
// M2 Finance schemas

export const createAppealSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  code: z.string().min(1, 'Code required').max(50, 'Code too long'),
  name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  external_account_code: z.string().max(100).optional(),
});

export const updateAppealSchema = z.object({
  id: z.string().uuid('Invalid appeal ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  external_account_code: z.string().max(100).optional(),
});

export const createDonorSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  display_name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  email: z.string().email('Invalid email').optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().default(false),
});

export const updateDonorSchema = z.object({
  id: z.string().uuid('Invalid donor ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  display_name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email').optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().optional(),
});

export const createBankAccountSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1, 'Name required').max(200, 'Name too long'),
  account_last4: z.string().length(4).regex(/^\d{4}$/, 'Must be exactly 4 digits').optional(),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code').default('GBP'),
});

export const updateBankAccountSchema = z.object({
  id: z.string().uuid('Invalid bank account ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type CreateAppealInput = z.infer<typeof createAppealSchema>;
export type UpdateAppealInput = z.infer<typeof updateAppealSchema>;
export type CreateDonorInput = z.infer<typeof createDonorSchema>;
export type UpdateDonorInput = z.infer<typeof updateDonorSchema>;
export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/v2.ts src/lib/validation/v2.ts
git commit -m "feat(types): add M2 Appeal, Donor, BankAccount types and Zod schemas"
```

---

## Task 3: Appeals server actions

**Files:**
- Create: `src/app/actions/v2/appeals.ts`

- [ ] **Step 1: Create `src/app/actions/v2/appeals.ts`**

```ts
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
): Promise<ActionResult> {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/appeals.ts
git commit -m "feat(actions): add v2 appeals server actions

createAppeal, getAppeal, listAppeals, updateAppeal, archiveAppeal.
Finance manager+ required to mutate. All members can read.
Audit logs on create/update/archive."
```

---

## Task 4: Donors server actions

**Files:**
- Create: `src/app/actions/v2/donors.ts`

- [ ] **Step 1: Create `src/app/actions/v2/donors.ts`**

```ts
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

  // Use anon client — RLS has_org_role policy enforces access
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/donors.ts
git commit -m "feat(actions): add v2 donor server actions

createDonor, getDonor, listDonors, updateDonor.
finance_assistant+ required to read/write. Audit logs on create/update.
Donors restricted from viewer role (personal data protection)."
```

---

## Task 5: Bank accounts server actions

**Files:**
- Create: `src/app/actions/v2/bankAccounts.ts`

- [ ] **Step 1: Create `src/app/actions/v2/bankAccounts.ts`**

```ts
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
    .update(updates)
    .eq('id', id)
    .eq('organisation_id', organisation_id)
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to update bank account' };

  return { data };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/bankAccounts.ts
git commit -m "feat(actions): add v2 bank account server actions

createBankAccount, listBankAccounts, updateBankAccount.
owner/admin only for create/update. account_last4 only — no full account numbers stored."
```

---

## Task 6: Tests + typecheck + CHANGELOG + push

**Files:**
- Create: `src/__tests__/v2/finance.test.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Create `src/__tests__/v2/finance.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  createAppealSchema,
  updateAppealSchema,
  createDonorSchema,
  updateDonorSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
} from '@/lib/validation/v2';

describe('createAppealSchema', () => {
  it('accepts valid appeal', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'GEN-2024',
      name: 'General Fund 2024',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing code', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'General Fund',
    });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 50 chars', () => {
    const result = createAppealSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'A'.repeat(51),
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('createDonorSchema', () => {
  it('accepts valid donor with defaults', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'John Smith',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gift_aid_eligible).toBe(false);
    }
  });

  it('rejects invalid email', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'John Smith',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts gift_aid_eligible true', () => {
    const result = createDonorSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      display_name: 'Gift Aid Donor',
      gift_aid_eligible: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.gift_aid_eligible).toBe(true);
  });
});

describe('createBankAccountSchema', () => {
  it('accepts valid bank account', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'General Account',
      account_last4: '1234',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('GBP');
  });

  it('rejects non-digit account_last4', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      account_last4: 'ABCD',
    });
    expect(result.success).toBe(false);
  });

  it('rejects account_last4 that is not 4 chars', () => {
    const result = createBankAccountSchema.safeParse({
      organisation_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      account_last4: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateBankAccountSchema', () => {
  it('accepts valid status update', () => {
    const result = updateBankAccountSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'archived',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateBankAccountSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      organisation_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — all must pass**

```bash
npm test
```

Expected: all tests pass (11 from M1 + new M2 tests). If any fail, fix the schema, not the test.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any errors. If `.issues` vs `.errors` causes problems on Zod v4, use `.issues[0].message`. If `ActionResult<void>` return `{}` causes errors, use `return { data: undefined as void }`.

- [ ] **Step 4: Prepend M2 entry to `CHANGELOG.md`**

Add this BEFORE the existing `## [M1]` entry:

```markdown
## [M2] — 2026-06-18

### Added
- `appeals` table: org-scoped, code+name, active/archived status, unique(org, code) constraint
- `donors` table: org-scoped, display_name, email, gift_aid_eligible, active/archived status
- `bank_accounts` table: org-scoped, name, account_last4 only (no full account numbers), currency
- RLS policies for M2 tables: viewers can read appeals; finance roles manage donors; owner/admin only manage bank accounts
- v2 server actions: `createAppeal`, `getAppeal`, `listAppeals`, `updateAppeal`, `archiveAppeal`
- v2 server actions: `createDonor`, `getDonor`, `listDonors`, `updateDonor`
- v2 server actions: `createBankAccount`, `listBankAccounts`, `updateBankAccount`
- Zod schemas and TypeScript types for Appeal, Donor, BankAccount
- Finance validation unit tests

### Security
- Donors restricted from viewer role (personal data)
- Bank accounts restricted to owner/admin for create/update; finance_manager/auditor read-only
- account_last4 enforced as exactly 4 digits — no full account numbers stored
- Audit logs on all appeal and donor mutations

```

- [ ] **Step 5: Commit and push**

```bash
git add src/__tests__/v2/finance.test.ts CHANGELOG.md
git commit -m "test(v2): add M2 finance validation tests and update CHANGELOG"
git push origin main
```

---

## Completion summary

```
What changed:
  - 3 new migrations (011-013): appeals, donors, bank_accounts + RLS policies
  - src/lib/types/v2.ts: Appeal, Donor, BankAccount, status types appended
  - src/lib/validation/v2.ts: 6 Zod schemas appended
  - src/app/actions/v2/appeals.ts: 5 server actions
  - src/app/actions/v2/donors.ts: 4 server actions
  - src/app/actions/v2/bankAccounts.ts: 3 server actions
  - src/__tests__/v2/finance.test.ts: validation unit tests

Security impact:
  - Donors not visible to viewer role (personal data boundary)
  - Bank accounts restricted to privileged roles
  - account_last4 Zod enforces no full account number storage

RLS impact:
  - appeals: all members select; finance_manager+ insert/update
  - donors: finance roles only (not viewer) select/insert/update
  - bank_accounts: owner/admin insert/update; finance_manager/auditor select

Finance/audit impact:
  - Audit log on: appeal create/update/archive, donor create/update
  - No audit on bank_accounts (setup-only, low change frequency)

Tests added:
  - createAppealSchema: 3 tests
  - createDonorSchema: 3 tests
  - createBankAccountSchema: 3 tests
  - updateBankAccountSchema: 2 tests

Manual checks needed:
  - Apply migrations 011-013 to Supabase in order via SQL editor
  - Verify tables exist in Supabase Table Editor
  - Confirm SUPABASE_SERVICE_ROLE_KEY is set in .env.local and Vercel env vars

Open risks:
  - No duplicate donor detection yet (M3 concern)
  - No UI for any of these tables yet (M2 exit criteria met via API only)
```
