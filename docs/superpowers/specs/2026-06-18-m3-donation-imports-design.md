# M3 — Donation Imports Design Spec

**Date:** 2026-06-18  
**Milestone:** M3 — Donation Imports  
**Status:** Approved for implementation

---

## What we are building

A server-side CSV import pipeline for donation data. After M3, a finance manager can upload a bank CSV or Stripe export, and Steward will parse it, deduplicate against existing imports, attempt to map donations to appeals and donors, and store every row with the original raw data preserved. No UI — backend pipeline only.

---

## Scope

M3 covers:

1. Supabase migrations 014–015: `donation_import_batches` and `donations` tables with RLS
2. Hardcoded column maps for two source types: `bank_csv` and `stripe`
3. TypeScript types + Zod validation for import inputs
4. Server actions (v2): `imports.ts` — batch creation, row import, listing
5. Unit tests for new Zod schemas

M3 does **not** include: file upload UI, gift aid calculations, reconciliation, manual donation entry, or additional source types (ChurchSuite, WorldPay).

---

## Backend Impact Check

```
Backend Impact Check:
- Business rule: Donations scoped to organisation. Finance managers can import. Auditors read-only.
  Duplicate imports (same source + source_reference) are silently skipped, not errored.
  Raw row data preserved in jsonb for auditability and future re-processing.
- Tables affected: donation_import_batches (new), donations (new)
- Tenant boundary: organisation_id on both tables
- Roles affected:
    import_batches: create — owner, admin, finance_manager; read — owner, admin, finance_manager, auditor
    donations: insert — server-side only (admin client); read — owner, admin, finance_manager, auditor
- RLS affected: both new tables
- Audit log required: import batch completed (action: import.completed)
- Stripe/payment impact: none (Stripe CSV export only, no webhook or API)
- Migration required: yes — migrations 014–015
- Tests required: Zod schema unit tests for import input validation
- Risk level: MEDIUM — financial data ingestion; duplicate prevention and raw data preservation critical
```

---

## Schema

### Migration 014 — donation_import_batches and donations

```sql
-- 014: Donation import batches and donations

create table if not exists donation_import_batches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  bank_account_id uuid references bank_accounts(id) on delete set null,
  source text not null check (source in ('bank_csv', 'stripe')),
  filename text not null,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'complete', 'failed')),
  raw_headers jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  import_batch_id uuid references donation_import_batches(id) on delete set null,
  appeal_id uuid references appeals(id) on delete set null,
  donor_id uuid references donors(id) on delete set null,
  source text not null check (source in ('bank_csv', 'stripe')),
  source_reference text not null,
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'GBP',
  transaction_date date not null,
  description text,
  raw_row jsonb not null,
  status text not null default 'imported' check (status in ('imported', 'matched', 'reconciled')),
  created_at timestamptz not null default now(),
  constraint unique_donation_source unique (organisation_id, source, source_reference)
);
```

### Migration 015 — RLS policies + indexes

```sql
-- 015: RLS policies for M3 donation import tables

-- donation_import_batches
alter table donation_import_batches enable row level security;

create policy "finance privileged can view import batches"
on donation_import_batches for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

create policy "finance managers can insert import batches"
on donation_import_batches for insert
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager']
  )
);

-- donations
alter table donations enable row level security;

create policy "finance privileged can view donations"
on donations for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

-- No insert policy on donations — server-side admin client only

-- Indexes
create index if not exists idx_import_batches_org_id on donation_import_batches(organisation_id);
create index if not exists idx_import_batches_org_status on donation_import_batches(organisation_id, status);
create index if not exists idx_donations_org_id on donations(organisation_id);
create index if not exists idx_donations_org_batch on donations(organisation_id, import_batch_id);
create index if not exists idx_donations_org_appeal on donations(organisation_id, appeal_id);
create index if not exists idx_donations_source_ref on donations(organisation_id, source, source_reference);
```

---

## TypeScript types (add to `src/lib/types/v2.ts`)

```ts
export type ImportSource = 'bank_csv' | 'stripe';
export type ImportBatchStatus = 'processing' | 'complete' | 'failed';
export type DonationStatus = 'imported' | 'matched' | 'reconciled';

export interface DonationImportBatch {
  id: string;
  organisation_id: string;
  bank_account_id: string | null;
  source: ImportSource;
  filename: string;
  row_count: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  status: ImportBatchStatus;
  raw_headers: Record<string, string> | null;
  created_by: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  organisation_id: string;
  import_batch_id: string | null;
  appeal_id: string | null;
  donor_id: string | null;
  source: ImportSource;
  source_reference: string;
  amount_pence: number;
  currency: string;
  transaction_date: string;
  description: string | null;
  raw_row: Record<string, unknown>;
  status: DonationStatus;
  created_at: string;
}

export interface ImportRowResult {
  source_reference: string;
  status: 'imported' | 'skipped' | 'error';
  error?: string;
}

export interface ImportBatchResult {
  batch_id: string;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  rows: ImportRowResult[];
}
```

---

## Zod validation (add to `src/lib/validation/v2.ts`)

```ts
export const createImportBatchSchema = z.object({
  organisation_id: z.string().uuid(),
  source: z.enum(['bank_csv', 'stripe']),
  filename: z.string().min(1).max(255),
  bank_account_id: z.string().uuid().optional(),
});

// A single raw CSV row as submitted for import
export const importDonationRowSchema = z.object({
  source_reference: z.string().min(1).max(255),
  amount_pence: z.number().int().positive(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  appeal_code: z.string().max(50).optional(),
  donor_email: z.string().email().optional(),
  raw_row: z.record(z.unknown()),
});

export const importDonationsSchema = z.object({
  batch_id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  rows: z.array(importDonationRowSchema).min(1).max(5000),
});

export const listDonationsSchema = z.object({
  organisation_id: z.string().uuid(),
  appeal_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

---

## Column maps (hardcoded in `src/lib/importMaps/`)

Column maps transform a raw CSV row (string keys/values) into `importDonationRowSchema`-shaped objects. They are pure functions — no DB access.

### `src/lib/importMaps/bankCsv.ts`

Expected CSV headers (case-insensitive): `Date`, `Description`, `Credit`, `Debit`, `Transaction ID` (or `Reference`).

Rules:
- Skip rows where `Credit` is empty or zero (debit-only rows)
- `amount_pence` = `parseFloat(Credit) * 100` rounded to integer
- `transaction_date` = parse UK date format `DD/MM/YYYY` → `YYYY-MM-DD`
- `source_reference` = `Transaction ID` if present, else `{Date}-{Description}-{Credit}` hash
- `raw_row` = original row object unchanged

### `src/lib/importMaps/stripe.ts`

Expected CSV headers (Stripe dashboard export): `id`, `created (UTC)`, `amount`, `currency`, `description`, `customer_email`, `status`.

Rules:
- Skip rows where `status` is not `paid` or `succeeded`
- `amount_pence` = integer value of `amount` column (Stripe exports pence directly for GBP)
- `transaction_date` = parse `created (UTC)` ISO timestamp → `YYYY-MM-DD`
- `source_reference` = `id` column (e.g. `ch_xxx` or `pi_xxx`)
- `donor_email` = `customer_email` if present
- `raw_row` = original row object unchanged

---

## Server actions (`src/app/actions/v2/imports.ts`)

```
createImportBatch(input) 
  → requireRole(owner/admin/finance_manager) 
  → validate createImportBatchSchema 
  → admin insert batch (status='processing') 
  → return { data: batch }

importDonations(input)
  → requireRole(owner/admin/finance_manager) 
  → validate importDonationsSchema
  → verify batch belongs to org
  → for each row:
      → attempt admin insert donation
      → on unique constraint violation: skipped++
      → on other error: error++, collect error message
      → on success: try appeal_code match → update appeal_id; try donor_email match → update donor_id; imported++
  → admin update batch: imported_count, skipped_count, error_count, status='complete'
  → audit log: import.completed
  → return ImportBatchResult

listImportBatches(orgId)
  → requireRole(owner/admin/finance_manager/auditor)
  → anon client select, ordered by created_at desc

listDonations(input)
  → requireRole(owner/admin/finance_manager/auditor)
  → validate listDonationsSchema
  → anon client select with optional filters
```

---

## Security rules

1. No donations inserted via client — admin client only in `importDonations` action
2. Duplicate prevention via DB unique constraint on `(organisation_id, source, source_reference)` — not application logic
3. `raw_row` jsonb preserves original import data — never mutated after insert
4. `amount_pence` integer — no floats, no money as string
5. Audit log on every completed batch
6. Role check on every action — auditor read-only, viewer excluded entirely

---

## Exit criteria

- [ ] Finance manager can create an import batch
- [ ] Uploading same CSV twice skips duplicates (skipped_count increments, no error)
- [ ] Donations linked to appeals where appeal_code matches
- [ ] Donations linked to donors where donor email matches
- [ ] Raw row data preserved in `raw_row` jsonb
- [ ] Auditor can read donations and batches but cannot import
- [ ] Audit log written on batch completion
