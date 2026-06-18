# M3 — Donation Imports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-side CSV donation import pipeline supporting bank CSV and Stripe export formats, with duplicate prevention, appeal/donor matching, and full audit trail.

**Architecture:** Two new migrations (014–015) add `donation_import_batches` and `donations` tables with RLS. Hardcoded column maps in `src/lib/importMaps/` transform raw CSV rows into normalised donation objects. A single server actions file (`imports.ts`) handles batch creation, row import, and listing.

**Tech Stack:** Next.js App Router server actions, Supabase Postgres + RLS, Zod v4, Vitest v4.1.9. `@` alias → `src/`. TypeScript strict. Test framework: node environment, no DOM.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/014_donation_tables.sql` | Create | Tables: donation_import_batches, donations |
| `supabase/migrations/015_m3_rls_policies.sql` | Create | RLS + indexes for both tables |
| `src/lib/types/v2.ts` | Modify | Append M3 types |
| `src/lib/validation/v2.ts` | Modify | Append M3 Zod schemas |
| `src/lib/importMaps/bankCsv.ts` | Create | Column map: generic UK bank CSV → ImportDonationRow |
| `src/lib/importMaps/stripe.ts` | Create | Column map: Stripe export CSV → ImportDonationRow |
| `src/app/actions/v2/imports.ts` | Create | Server actions: createImportBatch, importDonations, listImportBatches, listDonations |
| `src/__tests__/v2/imports.test.ts` | Create | Unit tests: Zod schemas + column map pure functions |
| `CHANGELOG.md` | Modify | Prepend M3 entry |

---

## Task 1: Migrations 014–015

**Files:**
- Create: `supabase/migrations/014_donation_tables.sql`
- Create: `supabase/migrations/015_m3_rls_policies.sql`

- [ ] **Step 1: Create migration 014**

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

- [ ] **Step 2: Create migration 015**

```sql
-- 015: RLS policies for M3 donation import tables

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

alter table donations enable row level security;

create policy "finance privileged can view donations"
on donations for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

-- No insert policy on donations — admin client only

create index if not exists idx_import_batches_org_id on donation_import_batches(organisation_id);
create index if not exists idx_import_batches_org_status on donation_import_batches(organisation_id, status);
create index if not exists idx_donations_org_id on donations(organisation_id);
create index if not exists idx_donations_org_batch on donations(organisation_id, import_batch_id);
create index if not exists idx_donations_org_appeal on donations(organisation_id, appeal_id);
create index if not exists idx_donations_source_ref on donations(organisation_id, source, source_reference);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/014_donation_tables.sql supabase/migrations/015_m3_rls_policies.sql
git commit -m "feat(m3): migrations 014-015 — donation_import_batches and donations tables with RLS"
```

---

## Task 2: TypeScript types + Zod schemas

**Files:**
- Modify: `src/lib/types/v2.ts` (append after line 85)
- Modify: `src/lib/validation/v2.ts` (append after line 87)

- [ ] **Step 1: Append M3 types to `src/lib/types/v2.ts`**

Add after the last line:

```ts
// M3 Donation import types

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

- [ ] **Step 2: Append M3 Zod schemas to `src/lib/validation/v2.ts`**

Add after the last line:

```ts
// M3 Import schemas

export const createImportBatchSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  source: z.enum(['bank_csv', 'stripe']),
  filename: z.string().min(1, 'Filename required').max(255, 'Filename too long'),
  bank_account_id: z.string().uuid('Invalid bank account ID').optional(),
});

export const importDonationRowSchema = z.object({
  source_reference: z.string().min(1, 'Source reference required').max(255),
  amount_pence: z.number().int('Amount must be an integer').positive('Amount must be positive'),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().max(500).optional(),
  appeal_code: z.string().max(50).optional(),
  donor_email: z.string().email('Invalid donor email').optional(),
  raw_row: z.record(z.unknown()),
});

export const importDonationsSchema = z.object({
  batch_id: z.string().uuid('Invalid batch ID'),
  organisation_id: z.string().uuid('Invalid organisation ID'),
  rows: z
    .array(importDonationRowSchema)
    .min(1, 'At least one row required')
    .max(5000, 'Maximum 5000 rows per import'),
});

export const listDonationsSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  appeal_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateImportBatchInput = z.infer<typeof createImportBatchSchema>;
export type ImportDonationRow = z.infer<typeof importDonationRowSchema>;
export type ImportDonationsInput = z.infer<typeof importDonationsSchema>;
export type ListDonationsInput = z.infer<typeof listDonationsSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/v2.ts src/lib/validation/v2.ts
git commit -m "feat(m3): M3 TypeScript types and Zod schemas for donation imports"
```

---

## Task 3: Column maps

**Files:**
- Create: `src/lib/importMaps/bankCsv.ts`
- Create: `src/lib/importMaps/stripe.ts`

These are **pure functions** — no imports from Supabase, no server-only code, no `'use server'`. They take a raw CSV row (object with string keys/values) and return an `ImportDonationRow | null`.

- [ ] **Step 1: Create `src/lib/importMaps/bankCsv.ts`**

```ts
import type { ImportDonationRow } from '@/lib/validation/v2';

/**
 * Maps a generic UK bank CSV row to ImportDonationRow.
 * Returns null if row should be skipped (debit-only, zero credit, missing reference).
 *
 * Expected headers (case-insensitive lookup applied in mapBankCsvRow):
 *   Date, Description, Credit, Debit, Transaction ID (or Reference or Ref)
 *
 * Date format: DD/MM/YYYY
 */
export function mapBankCsvRow(
  row: Record<string, string>
): ImportDonationRow | null {
  const get = (keys: string[]): string => {
    for (const key of keys) {
      const found = Object.keys(row).find(
        (k) => k.trim().toLowerCase() === key.toLowerCase()
      );
      if (found && row[found]?.trim()) return row[found].trim();
    }
    return '';
  };

  const creditStr = get(['credit', 'amount', 'in']);
  if (!creditStr) return null;

  const creditFloat = parseFloat(creditStr.replace(/[£,]/g, ''));
  if (isNaN(creditFloat) || creditFloat <= 0) return null;

  const amount_pence = Math.round(creditFloat * 100);

  const rawDate = get(['date', 'transaction date', 'value date']);
  if (!rawDate) return null;

  // Parse DD/MM/YYYY → YYYY-MM-DD
  const parts = rawDate.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const transaction_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) return null;

  const description = get(['description', 'details', 'narrative', 'reference']) || '';

  const source_reference =
    get(['transaction id', 'transaction reference', 'ref', 'reference', 'id']) ||
    `${transaction_date}-${description.slice(0, 40)}-${amount_pence}`;

  return {
    source_reference,
    amount_pence,
    transaction_date,
    description: description || undefined,
    raw_row: row as Record<string, unknown>,
  };
}
```

- [ ] **Step 2: Create `src/lib/importMaps/stripe.ts`**

```ts
import type { ImportDonationRow } from '@/lib/validation/v2';

/**
 * Maps a Stripe dashboard CSV export row to ImportDonationRow.
 * Returns null if row should be skipped (not paid/succeeded, missing id, zero amount).
 *
 * Expected headers (standard Stripe dashboard export):
 *   id, created (UTC), amount, currency, description, customer_email, status
 *
 * amount: integer pence (Stripe exports minor units for GBP)
 * created (UTC): ISO timestamp e.g. 2024-01-15 14:32:00
 */
export function mapStripeRow(
  row: Record<string, string>
): ImportDonationRow | null {
  const get = (key: string): string => {
    const found = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase()
    );
    return found ? (row[found]?.trim() ?? '') : '';
  };

  const status = get('status').toLowerCase();
  if (status !== 'paid' && status !== 'succeeded') return null;

  const source_reference = get('id');
  if (!source_reference) return null;

  const amountStr = get('amount');
  const amount_pence = parseInt(amountStr, 10);
  if (isNaN(amount_pence) || amount_pence <= 0) return null;

  // Parse "2024-01-15 14:32:00" → "2024-01-15"
  const createdRaw = get('created (utc)') || get('created');
  if (!createdRaw) return null;
  const transaction_date = createdRaw.split(' ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) return null;

  const description = get('description') || undefined;
  const donor_email = get('customer_email') || undefined;

  return {
    source_reference,
    amount_pence,
    transaction_date,
    description,
    donor_email: donor_email && donor_email !== '' ? donor_email : undefined,
    raw_row: row as Record<string, unknown>,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/importMaps/bankCsv.ts src/lib/importMaps/stripe.ts
git commit -m "feat(m3): hardcoded column maps for bank CSV and Stripe export formats"
```

---

## Task 4: Import server actions

**Files:**
- Create: `src/app/actions/v2/imports.ts`

Follow the same pattern as `src/app/actions/v2/appeals.ts`: `'use server'` at top, `requireRole` helper, admin client for writes, anon client for reads, Zod v4 (`.issues[0].message`).

- [ ] **Step 1: Create `src/app/actions/v2/imports.ts`**

```ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createImportBatchSchema,
  importDonationsSchema,
  listDonationsSchema,
  type CreateImportBatchInput,
  type ImportDonationsInput,
  type ListDonationsInput,
} from '@/lib/validation/v2';
import type {
  DonationImportBatch,
  Donation,
  ImportBatchResult,
  ImportRowResult,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';

const IMPORT_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
const IMPORT_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

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

export async function createImportBatch(
  input: CreateImportBatchInput
): Promise<ActionResult<DonationImportBatch>> {
  const parsed = createImportBatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actorId = await requireRole(parsed.data.organisation_id, IMPORT_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('donation_import_batches')
    .insert({ ...parsed.data, created_by: actorId })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create import batch' };

  return { data };
}

export async function importDonations(
  input: ImportDonationsInput
): Promise<ActionResult<ImportBatchResult>> {
  const parsed = importDonationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { batch_id, organisation_id, rows } = parsed.data;

  const actorId = await requireRole(organisation_id, IMPORT_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  // Verify batch belongs to this org
  const { data: batch } = await admin
    .from('donation_import_batches')
    .select('id, source')
    .eq('id', batch_id)
    .eq('organisation_id', organisation_id)
    .single();

  if (!batch) return { error: 'Import batch not found' };

  // Load all appeals and donors for this org for matching
  const [{ data: appeals }, { data: donors }] = await Promise.all([
    admin
      .from('appeals')
      .select('id, code')
      .eq('organisation_id', organisation_id)
      .eq('status', 'active'),
    admin
      .from('donors')
      .select('id, email')
      .eq('organisation_id', organisation_id)
      .eq('status', 'active'),
  ]);

  const appealByCode = new Map<string, string>(
    (appeals ?? []).map((a: { id: string; code: string }) => [a.code, a.id])
  );
  const donorByEmail = new Map<string, string>(
    (donors ?? [])
      .filter((d: { id: string; email: string | null }) => d.email)
      .map((d: { id: string; email: string | null }) => [d.email!, d.id])
  );

  let imported_count = 0;
  let skipped_count = 0;
  let error_count = 0;
  const rowResults: ImportRowResult[] = [];

  for (const row of rows) {
    const appeal_id = row.appeal_code ? (appealByCode.get(row.appeal_code) ?? null) : null;
    const donor_id = row.donor_email ? (donorByEmail.get(row.donor_email) ?? null) : null;

    const { error: insertError } = await admin.from('donations').insert({
      organisation_id,
      import_batch_id: batch_id,
      source: batch.source,
      source_reference: row.source_reference,
      amount_pence: row.amount_pence,
      currency: 'GBP',
      transaction_date: row.transaction_date,
      description: row.description ?? null,
      raw_row: row.raw_row,
      appeal_id,
      donor_id,
      status: appeal_id || donor_id ? 'matched' : 'imported',
    });

    if (insertError) {
      // Postgres unique violation code = 23505
      if (insertError.code === '23505') {
        skipped_count++;
        rowResults.push({ source_reference: row.source_reference, status: 'skipped' });
      } else {
        error_count++;
        rowResults.push({
          source_reference: row.source_reference,
          status: 'error',
          error: insertError.message,
        });
      }
    } else {
      imported_count++;
      rowResults.push({ source_reference: row.source_reference, status: 'imported' });
    }
  }

  // Update batch counts
  await admin
    .from('donation_import_batches')
    .update({
      row_count: rows.length,
      imported_count,
      skipped_count,
      error_count,
      status: error_count === rows.length ? 'failed' : 'complete',
    })
    .eq('id', batch_id);

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'import.completed',
    entity_type: 'donation_import_batch',
    entity_id: batch_id,
    new_data: { imported_count, skipped_count, error_count },
  });

  return {
    data: {
      batch_id,
      imported_count,
      skipped_count,
      error_count,
      rows: rowResults,
    },
  };
}

export async function listImportBatches(
  orgId: string
): Promise<ActionResult<DonationImportBatch[]>> {
  if (!orgId) return { error: 'Organisation ID required' };

  const actorId = await requireRole(orgId, IMPORT_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('donation_import_batches')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function listDonations(
  input: ListDonationsInput
): Promise<ActionResult<Donation[]>> {
  const parsed = listDonationsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, appeal_id, batch_id, date_from, date_to } = parsed.data;

  const actorId = await requireRole(organisation_id, IMPORT_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  let query = supabase
    .from('donations')
    .select('*')
    .eq('organisation_id', organisation_id)
    .order('transaction_date', { ascending: false });

  if (appeal_id) query = query.eq('appeal_id', appeal_id);
  if (batch_id) query = query.eq('import_batch_id', batch_id);
  if (date_from) query = query.gte('transaction_date', date_from);
  if (date_to) query = query.lte('transaction_date', date_to);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/actions/v2/imports.ts
git commit -m "feat(m3): import server actions — createImportBatch, importDonations, listImportBatches, listDonations"
```

---

## Task 5: Tests

**Files:**
- Create: `src/__tests__/v2/imports.test.ts`

Tests cover: Zod schemas (pure validation) + column map pure functions. No Supabase, no server actions.

- [ ] **Step 1: Create `src/__tests__/v2/imports.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  createImportBatchSchema,
  importDonationRowSchema,
  importDonationsSchema,
  listDonationsSchema,
} from '@/lib/validation/v2';
import { mapBankCsvRow } from '@/lib/importMaps/bankCsv';
import { mapStripeRow } from '@/lib/importMaps/stripe';

const uuid = '12345678-1234-4234-8234-123456789abc';

// ── createImportBatchSchema ────────────────────────────────────────────────

describe('createImportBatchSchema', () => {
  it('accepts valid bank_csv batch', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'bank_csv',
      filename: 'barclays-jan-2024.csv',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid stripe batch with bank_account_id', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'stripe',
      filename: 'stripe-export.csv',
      bank_account_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'paypal',
      filename: 'export.csv',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing filename', () => {
    const result = createImportBatchSchema.safeParse({
      organisation_id: uuid,
      source: 'bank_csv',
    });
    expect(result.success).toBe(false);
  });
});

// ── importDonationRowSchema ────────────────────────────────────────────────

describe('importDonationRowSchema', () => {
  it('accepts valid row', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      raw_row: { Date: '15/01/2024', Credit: '50.00' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer amount', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 50.5,
      transaction_date: '2024-01-15',
      raw_row: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/integer/);
    }
  });

  it('rejects zero amount', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 0,
      transaction_date: '2024-01-15',
      raw_row: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '15/01/2024',
      raw_row: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/YYYY-MM-DD/);
    }
  });

  it('accepts optional donor_email', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      donor_email: 'donor@example.com',
      raw_row: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid donor_email', () => {
    const result = importDonationRowSchema.safeParse({
      source_reference: 'TXN-001',
      amount_pence: 5000,
      transaction_date: '2024-01-15',
      donor_email: 'not-an-email',
      raw_row: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── importDonationsSchema ─────────────────────────────────────────────────

describe('importDonationsSchema', () => {
  it('accepts valid input', () => {
    const result = importDonationsSchema.safeParse({
      batch_id: uuid,
      organisation_id: uuid,
      rows: [
        {
          source_reference: 'TXN-001',
          amount_pence: 5000,
          transaction_date: '2024-01-15',
          raw_row: {},
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty rows array', () => {
    const result = importDonationsSchema.safeParse({
      batch_id: uuid,
      organisation_id: uuid,
      rows: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/At least one row/);
    }
  });
});

// ── listDonationsSchema ───────────────────────────────────────────────────

describe('listDonationsSchema', () => {
  it('accepts organisation_id only', () => {
    const result = listDonationsSchema.safeParse({ organisation_id: uuid });
    expect(result.success).toBe(true);
  });

  it('accepts all optional filters', () => {
    const result = listDonationsSchema.safeParse({
      organisation_id: uuid,
      appeal_id: uuid,
      batch_id: uuid,
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date_from format', () => {
    const result = listDonationsSchema.safeParse({
      organisation_id: uuid,
      date_from: '01-01-2024',
    });
    expect(result.success).toBe(false);
  });
});

// ── mapBankCsvRow ─────────────────────────────────────────────────────────

describe('mapBankCsvRow', () => {
  it('maps a valid UK bank CSV row', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Sunday offering',
      Credit: '150.00',
      Debit: '',
      'Transaction ID': 'TXN-12345',
    };
    const result = mapBankCsvRow(row);
    expect(result).not.toBeNull();
    expect(result?.amount_pence).toBe(15000);
    expect(result?.transaction_date).toBe('2024-01-15');
    expect(result?.source_reference).toBe('TXN-12345');
    expect(result?.description).toBe('Sunday offering');
  });

  it('returns null for debit-only row (no credit)', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Bank charge',
      Credit: '',
      Debit: '5.00',
    };
    expect(mapBankCsvRow(row)).toBeNull();
  });

  it('returns null for zero credit', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Zero',
      Credit: '0.00',
    };
    expect(mapBankCsvRow(row)).toBeNull();
  });

  it('generates fallback source_reference when no Transaction ID', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Offering',
      Credit: '50.00',
    };
    const result = mapBankCsvRow(row);
    expect(result).not.toBeNull();
    expect(result?.source_reference).toContain('2024-01-15');
  });

  it('strips pound sign and commas from credit', () => {
    const row = {
      Date: '15/01/2024',
      Description: 'Large gift',
      Credit: '£1,500.00',
      'Transaction ID': 'TXN-999',
    };
    const result = mapBankCsvRow(row);
    expect(result?.amount_pence).toBe(150000);
  });
});

// ── mapStripeRow ──────────────────────────────────────────────────────────

describe('mapStripeRow', () => {
  it('maps a valid Stripe export row', () => {
    const row = {
      id: 'ch_abc123',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: 'Online giving',
      customer_email: 'donor@example.com',
      status: 'paid',
    };
    const result = mapStripeRow(row);
    expect(result).not.toBeNull();
    expect(result?.source_reference).toBe('ch_abc123');
    expect(result?.amount_pence).toBe(5000);
    expect(result?.transaction_date).toBe('2024-01-15');
    expect(result?.donor_email).toBe('donor@example.com');
  });

  it('returns null for non-paid status', () => {
    const row = {
      id: 'ch_abc123',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'failed',
    };
    expect(mapStripeRow(row)).toBeNull();
  });

  it('returns null for missing id', () => {
    const row = {
      id: '',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '5000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'paid',
    };
    expect(mapStripeRow(row)).toBeNull();
  });

  it('accepts succeeded status', () => {
    const row = {
      id: 'pi_xyz789',
      'created (UTC)': '2024-03-10 09:00:00',
      amount: '2500',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'succeeded',
    };
    const result = mapStripeRow(row);
    expect(result).not.toBeNull();
    expect(result?.amount_pence).toBe(2500);
  });

  it('omits donor_email when empty string', () => {
    const row = {
      id: 'ch_empty',
      'created (UTC)': '2024-01-15 14:32:00',
      amount: '1000',
      currency: 'gbp',
      description: '',
      customer_email: '',
      status: 'paid',
    };
    const result = mapStripeRow(row);
    expect(result?.donor_email).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd "/Users/jeffsmac/Gemini/Antigravity/Scratch/Steward app/steward-app" && npm test
```

Expected: all tests pass (36 existing + new imports tests). Fix any failures before continuing.

- [ ] **Step 3: Run typecheck**

```bash
cd "/Users/jeffsmac/Gemini/Antigravity/Scratch/Steward app/steward-app" && npx tsc --noEmit
```

Expected: no errors. Fix any type errors before committing.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/v2/imports.test.ts
git commit -m "test(m3): unit tests for import Zod schemas and column map pure functions"
```

---

## Task 6: CHANGELOG + push

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Prepend M3 entry to CHANGELOG.md before the existing M2 entry**

```markdown
## [M3] Donation Imports — 2026-06-18

### Added
- Migrations 014–015: `donation_import_batches` and `donations` tables with RLS
- Column maps: `src/lib/importMaps/bankCsv.ts` — generic UK bank CSV parser
- Column maps: `src/lib/importMaps/stripe.ts` — Stripe dashboard export parser
- Server actions: `src/app/actions/v2/imports.ts` — createImportBatch, importDonations, listImportBatches, listDonations
- Zod schemas: createImportBatchSchema, importDonationRowSchema, importDonationsSchema, listDonationsSchema
- TypeScript types: DonationImportBatch, Donation, ImportRowResult, ImportBatchResult, ImportSource, ImportBatchStatus, DonationStatus
- Unit tests for all M3 Zod schemas and column map pure functions

### Security
- Donations inserted via admin client only — no client-side RLS insert policy on donations table
- Duplicate prevention via DB unique constraint on (organisation_id, source, source_reference)
- Raw CSV row preserved in raw_row jsonb — never mutated after insert
- amount_pence integer only — no floats, no money stored as string
- Audit log written on every completed import batch (action: import.completed)
- Auditor role read-only; viewer excluded from all import/donation access
```

- [ ] **Step 2: Commit and push**

```bash
cd "/Users/jeffsmac/Gemini/Antigravity/Scratch/Steward app/steward-app" && git add CHANGELOG.md && git commit -m "docs(m3): CHANGELOG M3 donation imports entry" && git push origin main
```

---

## Manual steps after implementation

Before the import pipeline works in production, apply migrations to Supabase:

1. Open Supabase dashboard → SQL Editor
2. Run `014_donation_tables.sql`
3. Run `015_m3_rls_policies.sql`

These must run in order. Migrations 007–013 must already be applied from M1/M2.
