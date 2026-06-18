# M5 — Gift Aid Design Spec

**Date:** 2026-06-18  
**Milestone:** M5 — Gift Aid  
**Status:** Approved for implementation

---

## What we are building

A Gift Aid pipeline for UK churches. Finance managers can record donor declarations (enduring, retro, or single), create claims over a date range that automatically find eligible donations covered by valid declarations, and submit claims — generating both a Charities Online CSV (HMRC bulk upload format) and a summary report. No UI — backend pipeline only.

---

## Scope

M5 covers:

1. Supabase migration 017: `gift_aid_declarations`, `gift_aid_claims`, `gift_aid_claim_donations` tables with RLS
2. TypeScript types + Zod validation
3. Pure CSV generator: `src/lib/giftAid/csv.ts`
4. Server actions (v2): `giftAid.ts` — declarations, claims, submission
5. Unit tests for Zod schemas, CSV generator, and declaration coverage logic

M5 does **not** include: UI, direct HMRC API submission, Gift Aid Small Donations Scheme (GASDS), higher-rate taxpayer top-up, or address/postcode collection.

---

## Backend Impact Check

```
Backend Impact Check:
- Business rule: Donations are Gift Aid eligible only when donor has gift_aid_eligible=true
  AND an active declaration (not revoked, covering the donation date).
  gift_aid_pence = ROUND(amount_pence * 25.0 / 100.0).
  Donations already in a submitted claim cannot be re-claimed.
  Declarations can be revoked but not deleted (audit trail).
- Tables affected: gift_aid_declarations (new), gift_aid_claims (new), gift_aid_claim_donations (new)
- Tenant boundary: organisation_id on declarations and claims
- Roles affected:
    createDeclaration/revokeDeclaration: owner, admin, finance_manager
    listDeclarations: + auditor
    createClaim/submitClaim: owner, admin, finance_manager
- RLS affected: all three new tables
- Audit log required: gift_aid.declaration_created, gift_aid.declaration_revoked,
    gift_aid.claim_created, gift_aid.claim_submitted
- Stripe/payment impact: none
- Migration required: yes — migration 017
- Tests required: Zod schema tests, CSV generator tests, declaration coverage logic
- Risk level: HIGH — financial/legal; incorrect eligibility = HMRC compliance failure
```

---

## Schema

### Migration 017 — Gift Aid tables + RLS + indexes

```sql
-- 017: Gift Aid declarations, claims, and claim donations

-- Declarations: records that a donor has signed a Gift Aid declaration
create table if not exists gift_aid_declarations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  donor_id uuid not null references donors(id) on delete cascade,
  declaration_type text not null check (declaration_type in ('enduring', 'retro', 'single')),
  effective_from date not null,
  effective_to date,                   -- null = open-ended (enduring/retro until revoked)
  signed_at timestamptz not null,
  signed_by_name text not null,        -- donor's full name as written on declaration
  revoked_at timestamptz,              -- null = still active
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Claims: a batch of donations submitted (or to be submitted) to HMRC
create table if not exists gift_aid_claims (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  claim_period_from date not null,
  claim_period_to date not null,
  total_donations_pence bigint not null default 0,
  total_gift_aid_pence bigint not null default 0,
  donation_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Join table: which donations are included in which claim
create table if not exists gift_aid_claim_donations (
  claim_id uuid not null references gift_aid_claims(id) on delete cascade,
  donation_id uuid not null references donations(id) on delete cascade,
  declaration_id uuid not null references gift_aid_declarations(id),
  gift_aid_pence integer not null,
  primary key (claim_id, donation_id)
);

-- RLS: gift_aid_declarations
alter table gift_aid_declarations enable row level security;

create policy "finance privileged can view declarations"
on gift_aid_declarations for select
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor']));

create policy "finance managers can insert declarations"
on gift_aid_declarations for insert
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

create policy "finance managers can update declarations"
on gift_aid_declarations for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- RLS: gift_aid_claims
alter table gift_aid_claims enable row level security;

create policy "finance privileged can view claims"
on gift_aid_claims for select
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor']));

create policy "finance managers can insert claims"
on gift_aid_claims for insert
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

create policy "finance managers can update claims"
on gift_aid_claims for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- RLS: gift_aid_claim_donations (derive access from parent claim via org check)
alter table gift_aid_claim_donations enable row level security;

create policy "finance privileged can view claim donations"
on gift_aid_claim_donations for select
using (
  exists (
    select 1 from gift_aid_claims c
    where c.id = claim_id
    and public.has_org_role(c.organisation_id, array['owner','admin','finance_manager','auditor'])
  )
);

create policy "finance managers can insert claim donations"
on gift_aid_claim_donations for insert
with check (
  exists (
    select 1 from gift_aid_claims c
    where c.id = claim_id
    and public.has_org_role(c.organisation_id, array['owner','admin','finance_manager'])
  )
);

-- Indexes
create index if not exists idx_declarations_org_id on gift_aid_declarations(organisation_id);
create index if not exists idx_declarations_donor_id on gift_aid_declarations(organisation_id, donor_id);
create index if not exists idx_declarations_active on gift_aid_declarations(organisation_id, revoked_at) where revoked_at is null;
create index if not exists idx_claims_org_id on gift_aid_claims(organisation_id);
create index if not exists idx_claim_donations_claim_id on gift_aid_claim_donations(claim_id);
create index if not exists idx_claim_donations_donation_id on gift_aid_claim_donations(donation_id);
```

---

## TypeScript types (add to `src/lib/types/v2.ts`)

```ts
// M5 Gift Aid types

export type DeclarationType = 'enduring' | 'retro' | 'single';
export type ClaimStatus = 'draft' | 'submitted';

export interface GiftAidDeclaration {
  id: string;
  organisation_id: string;
  donor_id: string;
  declaration_type: DeclarationType;
  effective_from: string;         // YYYY-MM-DD
  effective_to: string | null;    // YYYY-MM-DD or null (open-ended)
  signed_at: string;              // ISO timestamp
  signed_by_name: string;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GiftAidClaim {
  id: string;
  organisation_id: string;
  claim_period_from: string;       // YYYY-MM-DD
  claim_period_to: string;         // YYYY-MM-DD
  total_donations_pence: number;
  total_gift_aid_pence: number;
  donation_count: number;
  status: ClaimStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GiftAidClaimDonation {
  claim_id: string;
  donation_id: string;
  declaration_id: string;
  gift_aid_pence: number;
}

export interface ClaimSummary {
  claim: GiftAidClaim;
  donation_count: number;
  total_donations_pence: number;
  total_gift_aid_pence: number;
}

export interface SubmitClaimResult {
  claim: GiftAidClaim;
  summary: ClaimSummary;
  csv: string;
}
```

---

## Zod validation (add to `src/lib/validation/v2.ts`)

```ts
// M5 Gift Aid schemas

export const createDeclarationSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  donor_id: z.string().uuid('Invalid donor ID'),
  declaration_type: z.enum(['enduring', 'retro', 'single']),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  signed_at: z.string().datetime('Must be ISO datetime'),
  signed_by_name: z.string().min(1, 'Signed name required').max(200),
});

export const revokeDeclarationSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  declaration_id: z.string().uuid('Invalid declaration ID'),
});

export const listDeclarationsSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  donor_id: z.string().uuid('Invalid donor ID').optional(),
});

export const createClaimSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  claim_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  claim_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
}).refine(
  (d) => d.claim_period_from <= d.claim_period_to,
  { message: 'claim_period_from must be on or before claim_period_to' }
);

export const submitClaimSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  claim_id: z.string().uuid('Invalid claim ID'),
});

export type CreateDeclarationInput = z.infer<typeof createDeclarationSchema>;
export type RevokeDeclarationInput = z.infer<typeof revokeDeclarationSchema>;
export type ListDeclarationsInput = z.infer<typeof listDeclarationsSchema>;
export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;
```

---

## CSV generator (`src/lib/giftAid/csv.ts`)

Pure function — no Supabase, fully testable.

```ts
export interface CsvDonationRow {
  donor_display_name: string;   // split into title/first/last by best-effort
  transaction_date: string;     // YYYY-MM-DD
  amount_pence: number;
}

export function buildCharitiesOnlineCsv(rows: CsvDonationRow[]): string
```

**Charities Online CSV columns (HMRC bulk upload):**
`Donor title`, `Donor first name`, `Donor last name`, `House name or number`, `Postcode`, `Donation date`, `Donation amount`

**Name splitting:** `display_name` split on first space — first word = first name, remainder = last name. Title = empty (not stored). House/Postcode = empty (not stored). Donation date = `transaction_date`. Donation amount = `amount_pence / 100` formatted as `"50.00"` (2 decimal places, no currency symbol).

---

## Server actions (`src/app/actions/v2/giftAid.ts`)

```
createDeclaration(input: CreateDeclarationInput): Promise<ActionResult<GiftAidDeclaration>>
  → validate createDeclarationSchema
  → requireRole(owner/admin/finance_manager)
  → verify donor belongs to org + gift_aid_eligible = true
    → error if not eligible: 'Donor is not marked as Gift Aid eligible'
  → admin insert declaration (created_by = actorId)
  → audit log: gift_aid.declaration_created
  → return { data: declaration }

revokeDeclaration(input: RevokeDeclarationInput): Promise<ActionResult<GiftAidDeclaration>>
  → validate revokeDeclarationSchema
  → requireRole(owner/admin/finance_manager)
  → verify declaration belongs to org
  → verify not already revoked
  → admin update: revoked_at = now()
  → audit log: gift_aid.declaration_revoked
  → return { data: declaration }

listDeclarations(input: ListDeclarationsInput): Promise<ActionResult<GiftAidDeclaration[]>>
  → validate listDeclarationsSchema
  → requireRole(owner/admin/finance_manager/auditor)
  → anon client select, optional donor_id filter, ordered by created_at desc

createClaim(input: CreateClaimInput): Promise<ActionResult<GiftAidClaim>>
  → validate createClaimSchema
  → requireRole(owner/admin/finance_manager)
  → load all donations in date range for org
  → load all active declarations for org (revoked_at IS NULL)
  → load donors with gift_aid_eligible = true for org
  → for each donation:
      → donor must be gift_aid_eligible
      → donor must have an active declaration where:
          effective_from <= transaction_date
          AND (effective_to IS NULL OR effective_to >= transaction_date)
      → donation must NOT already exist in a submitted claim
        (check gift_aid_claim_donations joined to gift_aid_claims where status='submitted')
      → calculate gift_aid_pence = ROUND(amount_pence * 25.0 / 100.0)
  → admin insert gift_aid_claims (status='draft', totals, created_by)
  → admin insert gift_aid_claim_donations (one row per eligible donation)
  → audit log: gift_aid.claim_created
  → return { data: claim }

submitClaim(input: SubmitClaimInput): Promise<ActionResult<SubmitClaimResult>>
  → validate submitClaimSchema
  → requireRole(owner/admin/finance_manager)
  → load claim — verify belongs to org, status='draft'
    → error if already submitted: 'Claim is already submitted'
  → load claim_donations joined to donations + donors
  → admin update claim: status='submitted', submitted_at=now(), submitted_by=actorId
  → build CSV via buildCharitiesOnlineCsv()
  → audit log: gift_aid.claim_submitted
  → return { data: { claim, summary, csv } }
```

---

## Security rules

1. Declarations are never hard-deleted — only revoked (audit trail for HMRC)
2. Donations in submitted claims cannot be re-claimed (checked at createClaim time)
3. gift_aid_pence = `ROUND(amount_pence * 25.0 / 100.0)` — integer pence, no floats stored
4. Donor `gift_aid_eligible` must be true — not just having a declaration
5. All writes use admin client; reads use anon client (RLS)
6. Audit log on every declaration and claim action

---

## Tests (`src/__tests__/v2/giftAid.test.ts`)

**Zod schema tests:**
- `createDeclarationSchema`: valid enduring, valid retro, rejects missing signed_by_name, rejects invalid date format, rejects invalid declaration_type
- `createClaimSchema`: valid range, rejects from > to (refine check)
- `revokeDeclarationSchema`: valid input, rejects non-uuid

**CSV generator tests (`buildCharitiesOnlineCsv`):**
- Empty rows returns header only
- Single row: correct columns, amount formatted as "X.XX", date correct
- Name split: "John Smith" → first="John" last="Smith"
- Name with multiple words: "Mary Jane Watson" → first="Mary" last="Jane Watson"
- Amount: 5000 pence → "50.00"
- Amount: 101 pence → "1.01"

**Declaration coverage logic (pure helper):**
- Extract `isDeclarationActive(declaration, transaction_date)` as testable pure function
- Enduring with no effective_to covers any future date
- Retro with effective_from in the past covers that date
- Revoked declaration returns false
- Declaration with effective_to before transaction_date returns false

---

## Exit criteria

- [ ] Finance manager can record an enduring, retro, or single declaration for a donor
- [ ] Revoking a declaration excludes it from future claims
- [ ] Creating a claim finds only donations covered by active declarations
- [ ] Donations in submitted claims are excluded from new claims
- [ ] `gift_aid_pence` = ROUND(amount_pence × 25/100) per donation
- [ ] Submitting a claim generates valid Charities Online CSV
- [ ] Auditor can read declarations and claims but cannot create/revoke/submit
- [ ] Audit log written for every declaration and claim action
