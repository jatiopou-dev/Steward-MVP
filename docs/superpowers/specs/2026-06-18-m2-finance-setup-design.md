# M2 — Finance Setup Design Spec

**Date:** 2026-06-18  
**Milestone:** M2 — Finance Setup  
**Status:** Approved for implementation

---

## What we are building

Three finance foundation tables (`appeals`, `donors`, `bank_accounts`) with full RLS, server actions, Zod validation, and audit logging. After M2, a finance manager can create appeals and donors, a viewer can read but not mutate, and all changes are audited.

---

## Scope

M2 covers:

1. Supabase migrations 011–013
2. RLS policies on all three new tables
3. Zod schemas + TypeScript types for all new entities
4. Server actions (v2): appeals, donors, bank_accounts
5. Unit tests for new Zod schemas

M2 does **not** include: import batches, reconciliation, Stripe billing, or UI changes.

---

## Backend Impact Check

```
Backend Impact Check:
- Business rule: Finance data scoped to organisation. Finance managers/admins can mutate. Viewers/auditors read-only.
- Tables affected: appeals (new), donors (new), bank_accounts (new)
- Tenant boundary: organisation_id on all three tables
- Roles affected:
    appeals: create/update — owner, admin, finance_manager; read — all members; archive — owner, admin, finance_manager
    donors: create/update — owner, admin, finance_manager, finance_assistant; read — owner, admin, finance_manager, finance_assistant, auditor
    bank_accounts: create/update — owner, admin; read — owner, admin, finance_manager, auditor
- RLS affected: all three new tables
- Audit log required: appeal create/update/archive, donor create/update
- Stripe/payment impact: none in M2
- Migration required: yes — migrations 011–013
- Tests required: Zod schema unit tests; role-permission unit tests
- Risk level: MEDIUM — finance data, role enforcement critical
```

---

## Schema

### Migration 011 — Appeals and donors

```sql
-- 011: Appeals and donors

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

### Migration 012 — Bank accounts

```sql
-- 012: Bank accounts

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

### Migration 013 — RLS policies + indexes

```sql
-- 013: RLS policies for M2 finance tables

-- appeals
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

-- donors
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

-- bank_accounts
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

---

## TypeScript types (add to `src/lib/types/v2.ts`)

```ts
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

---

## Zod validation (add to `src/lib/validation/v2.ts`)

```ts
export const createAppealSchema = z.object({
  organisation_id: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  external_account_code: z.string().max(100).optional(),
});

export const updateAppealSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  external_account_code: z.string().max(100).optional(),
});

export const createDonorSchema = z.object({
  organisation_id: z.string().uuid(),
  display_name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().default(false),
});

export const updateDonorSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  display_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  external_reference: z.string().max(100).optional(),
  gift_aid_eligible: z.boolean().optional(),
});

export const createBankAccountSchema = z.object({
  organisation_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  account_last4: z.string().length(4).regex(/^\d{4}$/, 'Must be 4 digits').optional(),
  currency: z.string().length(3).default('GBP'),
});

export const updateBankAccountSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'archived']).optional(),
});
```

---

## Server actions

### `src/app/actions/v2/appeals.ts`

- `createAppeal(input)` — requireRole(owner/admin/finance_manager) → validate → insert → audit `appeal.created`
- `getAppeal(id, orgId)` — is_org_member check via anon client RLS
- `listAppeals(orgId, status?)` — anon client, filter by org + optional status
- `updateAppeal(input)` — requireRole(owner/admin/finance_manager) → validate → update → audit `appeal.updated`
- `archiveAppeal(id, orgId)` — requireRole(owner/admin/finance_manager) → set status='archived' → audit `appeal.archived`

### `src/app/actions/v2/donors.ts`

- `createDonor(input)` — requireRole(owner/admin/finance_manager/finance_assistant) → validate → insert → audit `donor.created`
- `getDonor(id, orgId)` — role check: owner/admin/finance_manager/finance_assistant/auditor
- `listDonors(orgId)` — role check: owner/admin/finance_manager/finance_assistant/auditor
- `updateDonor(input)` — requireRole(owner/admin/finance_manager/finance_assistant) → validate → update → audit `donor.updated`

### `src/app/actions/v2/bankAccounts.ts`

- `createBankAccount(input)` — requireRole(owner/admin) → validate → insert (no audit needed for setup)
- `listBankAccounts(orgId)` — role check: owner/admin/finance_manager/auditor
- `updateBankAccount(input)` — requireRole(owner/admin) → validate → update

Note: bank accounts use `account_last4` only — never store full account numbers.

---

## Security rules

1. No finance data read via anon client without role check — `donors` and `bank_accounts` use `has_org_role` in both RLS policies AND server-side permission checks
2. `code` field on appeals is org-unique (enforced by DB constraint `unique_appeal_code`)
3. No hard deletes — archive via `status='archived'`
4. Audit log on all appeal + donor mutations
5. `account_last4` is the only account number data stored — enforce in Zod (4 digits only)

---

## Exit criteria (from roadmap)

- [ ] Finance manager can create appeals
- [ ] Viewer can read appeals but not create/update/archive
- [ ] Audit logs capture appeal create/update/archive, donor create/update
- [ ] Bank accounts restricted to owner/admin create
