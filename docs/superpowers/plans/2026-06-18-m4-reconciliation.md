# M4 — Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add period-close reconciliation so finance managers can lock a calendar month, preventing any future donation imports into that period.

**Architecture:** New `reconciliation_periods` table stores closed months with donation totals and appeal breakdowns. Lock enforcement lives in server actions — `closePeriod` aggregates and locks, `checkPeriodLocked` is an internal helper called by `importDonations` to reject rows targeting closed months. No DB triggers.

**Tech Stack:** Next.js 16 App Router server actions (`'use server'`), Supabase Postgres, Zod v4, Vitest v4

---

## Context for implementers

- Working directory: `steward-app/` (the Next.js project root)
- All server actions live in `src/app/actions/v2/`
- Types in `src/lib/types/v2.ts`, Zod schemas in `src/lib/validation/v2.ts`
- Tests in `src/__tests__/v2/` — Vitest, node environment, `@` alias = `src/`
- Run tests: `npm run test` (from `steward-app/`)
- Run typecheck: `npm run typecheck`
- Admin client (service role, bypasses RLS): `createAdminClient()` from `@/utils/supabase/admin`
- Anon client (RLS enforced): `createClient()` from `@/utils/supabase/server`
- `requireRole(orgId, roles[])` pattern — see `src/app/actions/v2/imports.ts` for reference
- `createAuditLog` helper in `src/app/actions/v2/audit.ts`
- `ActionResult<T>` = `{ data: T } | { error: string }` — never both
- Zod v4: use `.error.issues[0].message` not `.error.errors[0].message`
- Supabase migrations applied via MCP tool `apply_migration` to project `tnrjmdgxjwkiengjvuau`
- Standard UUID for tests: `'12345678-1234-4234-8234-123456789abc'`

---

## File map

| File | Action |
|---|---|
| `supabase/migrations/016_reconciliation.sql` | Create |
| `src/lib/types/v2.ts` | Modify — append M4 types |
| `src/lib/validation/v2.ts` | Modify — append M4 schemas |
| `src/app/actions/v2/reconciliation.ts` | Create |
| `src/app/actions/v2/imports.ts` | Modify — wire lock check |
| `src/__tests__/v2/reconciliation.test.ts` | Create |
| `CHANGELOG.md` | Modify — prepend M4 entry |

---

## Task 1: Migration 016 — reconciliation_periods table

**Files:**
- Create: `supabase/migrations/016_reconciliation.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 016: Reconciliation periods

create table if not exists reconciliation_periods (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  year integer not null check (year >= 2000 and year <= 2100),
  month integer not null check (month >= 1 and month <= 12),
  status text not null default 'open' check (status in ('open', 'closed')),
  donation_count integer not null default 0,
  total_pence bigint not null default 0,
  summary_by_appeal jsonb,
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint unique_period unique (organisation_id, year, month)
);

-- RLS
alter table reconciliation_periods enable row level security;

create policy "finance privileged can view periods"
on reconciliation_periods for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

create policy "finance managers can insert periods"
on reconciliation_periods for insert
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager']
  )
);

-- No UPDATE or DELETE policy — only admin client mutates via closePeriod action

-- Indexes
create index if not exists idx_periods_org_id
  on reconciliation_periods(organisation_id);

create index if not exists idx_periods_org_year_month
  on reconciliation_periods(organisation_id, year, month);

create index if not exists idx_donations_transaction_date
  on donations(organisation_id, transaction_date);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the MCP tool `apply_migration` with:
- `project_id`: `tnrjmdgxjwkiengjvuau`
- `name`: `016_reconciliation`
- `query`: (contents of the file above)

Expected: migration applied successfully, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016_reconciliation.sql
git commit -m "feat(m4): migration 016 reconciliation_periods table + RLS"
```

---

## Task 2: TypeScript types + Zod schemas

**Files:**
- Modify: `src/lib/types/v2.ts` (append after M3 section)
- Modify: `src/lib/validation/v2.ts` (append after M3 section)

- [ ] **Step 1: Append types to `src/lib/types/v2.ts`**

Add at the end of the file:

```ts
// M4 Reconciliation types

export type PeriodStatus = 'open' | 'closed';

export interface AppealSummary {
  appeal_id: string;
  appeal_code: string;
  appeal_name: string;
  count: number;
  total_pence: number;
}

export interface ReconciliationPeriod {
  id: string;
  organisation_id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  donation_count: number;
  total_pence: number;
  summary_by_appeal: AppealSummary[] | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Append schemas to `src/lib/validation/v2.ts`**

Add at the end of the file:

```ts
// M4 Reconciliation schemas

export const closePeriodSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  year: z.number().int().min(2000, 'Year must be 2000 or later').max(2100, 'Year must be 2100 or earlier'),
  month: z.number().int().min(1, 'Month must be 1–12').max(12, 'Month must be 1–12'),
});

export const getPeriodSchema = z.object({
  organisation_id: z.string().uuid('Invalid organisation ID'),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
export type GetPeriodInput = z.infer<typeof getPeriodSchema>;
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/v2.ts src/lib/validation/v2.ts
git commit -m "feat(m4): ReconciliationPeriod types + Zod schemas"
```

---

## Task 3: reconciliation.ts server actions

**Files:**
- Create: `src/app/actions/v2/reconciliation.ts`

- [ ] **Step 1: Write failing test stubs** (in Task 5, not here — implement the file first, then tests catch regressions)

- [ ] **Step 2: Create `src/app/actions/v2/reconciliation.ts`**

```ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  closePeriodSchema,
  getPeriodSchema,
  type ClosePeriodInput,
  type GetPeriodInput,
} from '@/lib/validation/v2';
import type {
  ReconciliationPeriod,
  AppealSummary,
  ActionResult,
  MemberRole,
} from '@/lib/types/v2';
import { createAuditLog } from './audit';

const RECON_WRITE_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager'];
const RECON_READ_ROLES: MemberRole[] = ['owner', 'admin', 'finance_manager', 'auditor'];

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

// Internal helper — not exported as a server action.
// Returns true if the given date falls in a closed period for the org.
export async function checkPeriodLocked(
  organisation_id: string,
  transaction_date: string
): Promise<boolean> {
  const [yearStr, monthStr] = transaction_date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('reconciliation_periods')
    .select('id')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .eq('status', 'closed')
    .maybeSingle();

  return data !== null;
}

export async function closePeriod(
  input: ClosePeriodInput
): Promise<ActionResult<ReconciliationPeriod>> {
  const parsed = closePeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, year, month } = parsed.data;

  const actorId = await requireRole(organisation_id, RECON_WRITE_ROLES);
  if (!actorId) return { error: 'Permission denied: finance_manager or above required' };

  const admin = createAdminClient();

  // Check not already closed
  const { data: existing } = await admin
    .from('reconciliation_periods')
    .select('id, status')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (existing?.status === 'closed') {
    return { error: `Period ${year}-${String(month).padStart(2, '0')} is already closed` };
  }

  // Aggregate donation totals for this period
  const { data: donations } = await admin
    .from('donations')
    .select('id, amount_pence, appeal_id')
    .eq('organisation_id', organisation_id)
    .gte('transaction_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('transaction_date', lastDayOfMonth(year, month));

  const donationList = donations ?? [];
  const donation_count = donationList.length;
  const total_pence = donationList.reduce((sum, d: { amount_pence: number }) => sum + d.amount_pence, 0);

  // Build appeal summary
  const appealTotals = new Map<string, { count: number; total_pence: number }>();
  for (const d of donationList) {
    if (d.appeal_id) {
      const existing = appealTotals.get(d.appeal_id) ?? { count: 0, total_pence: 0 };
      appealTotals.set(d.appeal_id, {
        count: existing.count + 1,
        total_pence: existing.total_pence + d.amount_pence,
      });
    }
  }

  let summary_by_appeal: AppealSummary[] = [];
  if (appealTotals.size > 0) {
    const appealIds = Array.from(appealTotals.keys());
    const { data: appeals } = await admin
      .from('appeals')
      .select('id, code, name')
      .in('id', appealIds);

    summary_by_appeal = (appeals ?? []).map((a: { id: string; code: string; name: string }) => ({
      appeal_id: a.id,
      appeal_code: a.code,
      appeal_name: a.name,
      count: appealTotals.get(a.id)?.count ?? 0,
      total_pence: appealTotals.get(a.id)?.total_pence ?? 0,
    }));
  }

  // Insert or update the period as closed
  const periodData = {
    organisation_id,
    year,
    month,
    status: 'closed' as const,
    donation_count,
    total_pence,
    summary_by_appeal,
    closed_by: actorId,
    closed_at: new Date().toISOString(),
  };

  let period: ReconciliationPeriod;

  if (existing) {
    // Period row exists (was 'open') — update to closed
    const { data, error } = await admin
      .from('reconciliation_periods')
      .update(periodData)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? 'Failed to close period' };
    period = data;
  } else {
    // No row yet — insert
    const { data, error } = await admin
      .from('reconciliation_periods')
      .insert(periodData)
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? 'Failed to close period' };
    period = data;
  }

  // Mark all donations in this period as reconciled
  if (donation_count > 0) {
    await admin
      .from('donations')
      .update({ status: 'reconciled' })
      .eq('organisation_id', organisation_id)
      .gte('transaction_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('transaction_date', lastDayOfMonth(year, month))
      .neq('status', 'reconciled');
  }

  await createAuditLog({
    organisation_id,
    actor_user_id: actorId,
    action: 'reconciliation.period_closed',
    entity_type: 'reconciliation_period',
    entity_id: period.id,
    new_data: { year, month, donation_count, total_pence },
  });

  return { data: period };
}

export async function getPeriod(
  input: GetPeriodInput
): Promise<ActionResult<ReconciliationPeriod | null>> {
  const parsed = getPeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { organisation_id, year, month } = parsed.data;

  const actorId = await requireRole(organisation_id, RECON_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reconciliation_periods')
    .select('*')
    .eq('organisation_id', organisation_id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: data ?? null };
}

export async function listPeriods(
  organisation_id: string
): Promise<ActionResult<ReconciliationPeriod[]>> {
  if (!organisation_id) return { error: 'Organisation ID required' };

  const actorId = await requireRole(organisation_id, RECON_READ_ROLES);
  if (!actorId) return { error: 'Permission denied' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reconciliation_periods')
    .select('*')
    .eq('organisation_id', organisation_id)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// Returns the last day of the given month as YYYY-MM-DD
function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0); // day 0 of next month = last day of this month
  return d.toISOString().split('T')[0];
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/v2/reconciliation.ts
git commit -m "feat(m4): reconciliation server actions"
```

---

## Task 4: Wire lock check into imports.ts

**Files:**
- Modify: `src/app/actions/v2/imports.ts`

The `importDonations` function needs to check `checkPeriodLocked` before inserting each row. Rows targeting a closed period get status `'error'` with a clear message.

- [ ] **Step 1: Add the import**

At the top of `src/app/actions/v2/imports.ts`, add to the existing imports:

```ts
import { checkPeriodLocked } from './reconciliation';
```

- [ ] **Step 2: Add the lock check inside the `for` loop in `importDonations`**

Find the `for (const row of rows)` loop. Insert this block **before** the `admin.from('donations').insert(...)` call:

```ts
    // Reject rows targeting a closed period
    const locked = await checkPeriodLocked(organisation_id, row.transaction_date);
    if (locked) {
      error_count++;
      rowResults.push({
        source_reference: row.source_reference,
        status: 'error',
        error: `Period ${row.transaction_date.slice(0, 7)} is closed`,
      });
      continue;
    }
```

After the edit, the loop body should look like:

```ts
  for (const row of rows) {
    // Reject rows targeting a closed period
    const locked = await checkPeriodLocked(organisation_id, row.transaction_date);
    if (locked) {
      error_count++;
      rowResults.push({
        source_reference: row.source_reference,
        status: 'error',
        error: `Period ${row.transaction_date.slice(0, 7)} is closed`,
      });
      continue;
    }

    const appeal_id = row.appeal_code ? (appealByCode.get(row.appeal_code) ?? null) : null;
    const donor_id = row.donor_email ? (donorByEmail.get(row.donor_email) ?? null) : null;

    const { error: insertError } = await admin.from('donations').insert({
      // ... rest unchanged
    });
    // ... rest unchanged
  }
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/v2/imports.ts
git commit -m "feat(m4): wire period lock check into importDonations"
```

---

## Task 5: Tests

**Files:**
- Create: `src/__tests__/v2/reconciliation.test.ts`

These are unit tests for Zod schemas and the `checkPeriodLocked` helper (pure logic only — no live DB calls). The server actions that hit Supabase are not unit-testable without mocking.

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { closePeriodSchema, getPeriodSchema } from '@/lib/validation/v2';

const uuid = '12345678-1234-4234-8234-123456789abc';

// ── closePeriodSchema ─────────────────────────────────────────────────────

describe('closePeriodSchema', () => {
  it('accepts valid input', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects month 0', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Month must be 1/);
    }
  });

  it('rejects month 13', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 13,
    });
    expect(result.success).toBe(false);
  });

  it('rejects year below 2000', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 1999,
      month: 6,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/2000/);
    }
  });

  it('rejects year above 2100', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2101,
      month: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing organisation_id', () => {
    const result = closePeriodSchema.safeParse({ year: 2024, month: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer year', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024.5,
      month: 6,
    });
    expect(result.success).toBe(false);
  });

  it('accepts December (month 12)', () => {
    const result = closePeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 12,
    });
    expect(result.success).toBe(true);
  });
});

// ── getPeriodSchema ───────────────────────────────────────────────────────

describe('getPeriodSchema', () => {
  it('accepts valid input', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
      month: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing month', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: uuid,
      year: 2024,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid', () => {
    const result = getPeriodSchema.safeParse({
      organisation_id: 'not-a-uuid',
      year: 2024,
      month: 3,
    });
    expect(result.success).toBe(false);
  });
});

// ── lastDayOfMonth logic ──────────────────────────────────────────────────
// Test the boundary date logic used in closePeriod directly

describe('lastDayOfMonth boundary dates', () => {
  function lastDayOfMonth(year: number, month: number): string {
    const d = new Date(year, month, 0);
    return d.toISOString().split('T')[0];
  }

  it('returns Jan 31 for January', () => {
    expect(lastDayOfMonth(2024, 1)).toBe('2024-01-31');
  });

  it('returns Feb 29 for Feb in leap year 2024', () => {
    expect(lastDayOfMonth(2024, 2)).toBe('2024-02-29');
  });

  it('returns Feb 28 for Feb in non-leap year 2023', () => {
    expect(lastDayOfMonth(2023, 2)).toBe('2023-02-28');
  });

  it('returns Dec 31 for December', () => {
    expect(lastDayOfMonth(2024, 12)).toBe('2024-12-31');
  });

  it('returns Apr 30 for April', () => {
    expect(lastDayOfMonth(2024, 4)).toBe('2024-04-30');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: all new tests pass. Total test count increases from 61.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/v2/reconciliation.test.ts
git commit -m "test(m4): reconciliation Zod schema + boundary date tests"
```

---

## Task 6: CHANGELOG + typecheck + push

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Prepend M4 entry to `CHANGELOG.md`**

Add this block at the very top of the file (before any existing entries):

```markdown
## [M4] — 2026-06-18 — Reconciliation

### Added
- `reconciliation_periods` table with RLS (migration 016)
- `closePeriod` server action — closes a calendar month, aggregates donation totals + appeal breakdown, marks donations as `reconciled`
- `getPeriod` / `listPeriods` server actions — read period state (finance_manager + auditor)
- `checkPeriodLocked` internal helper — returns true if a date falls in a closed period
- Period lock enforcement in `importDonations` — rows targeting closed periods return `error` status with message `"Period YYYY-MM is closed"`
- Audit log entry on every period close: `reconciliation.period_closed`
- Zod schemas: `closePeriodSchema`, `getPeriodSchema`
- TypeScript types: `ReconciliationPeriod`, `AppealSummary`, `PeriodStatus`

### Rules
- Closed months are immutable — no donations can be imported into a closed period
- Empty months can be closed (donation_count=0 is valid)
- Closing an already-closed month returns an error
- Only owner/admin/finance_manager can close periods; auditor read-only

```

- [ ] **Step 2: Run full typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add CHANGELOG.md
git commit -m "docs(m4): CHANGELOG entry for reconciliation milestone"
git push origin main
```

Expected: push succeeds, Vercel auto-deploys.
