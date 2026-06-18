# M4 — Reconciliation Design Spec

**Date:** 2026-06-18  
**Milestone:** M4 — Period-Close Reconciliation  
**Status:** Approved for implementation

---

## What we are building

A period-close reconciliation system. Finance managers (treasurers) can close a calendar month for their organisation. Once closed, no donations with a `transaction_date` in that period can be imported or mutated. Corrections must go into the next open month. Closing a period aggregates donation totals by appeal and writes an audit log entry.

No UI — backend pipeline only.

---

## Scope

M4 covers:

1. Supabase migration 016: `reconciliation_periods` table with RLS
2. TypeScript types + Zod validation for reconciliation inputs
3. Server actions (v2): `reconciliation.ts` — close, get, list
4. Internal helper: `checkPeriodLocked` — used by `importDonations` to block rows targeting closed periods
5. Lock enforcement wired into `imports.ts`
6. Unit tests

M4 does **not** include: UI for period management, journal export, gift aid, report generation, or unlocking periods.

---

## Backend Impact Check

```
Backend Impact Check:
- Business rule: Calendar months are closed by finance managers. Once closed, no donations
  in that period can be imported. Empty months can be closed. Corrections go in next month.
- Tables affected: reconciliation_periods (new); donations (read only — status updated to 'reconciled' on close)
- Tenant boundary: organisation_id on reconciliation_periods
- Roles affected:
    closePeriod: owner, admin, finance_manager
    getPeriod / listPeriods: owner, admin, finance_manager, auditor
    checkPeriodLocked: internal server-side only
- RLS affected: reconciliation_periods (new table)
- Audit log required: reconciliation.period_closed
- Stripe/payment impact: none
- Migration required: yes — migration 016
- Tests required: Zod schema tests + server action unit tests
- Risk level: HIGH — financial lock; incorrect lock enforcement = data integrity failure
```

---

## Schema

### Migration 016 — reconciliation_periods table + RLS + indexes

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

-- No UPDATE or DELETE policy — periods updated only via admin client in closePeriod action

-- Indexes
create index if not exists idx_periods_org_id on reconciliation_periods(organisation_id);
create index if not exists idx_periods_org_year_month on reconciliation_periods(organisation_id, year, month);
create index if not exists idx_donations_transaction_date on donations(organisation_id, transaction_date);
```

---

## TypeScript types (add to `src/lib/types/v2.ts`)

```ts
export type PeriodStatus = 'open' | 'closed';

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

export interface AppealSummary {
  appeal_id: string;
  appeal_code: string;
  appeal_name: string;
  count: number;
  total_pence: number;
}
```

---

## Zod validation (add to `src/lib/validation/v2.ts`)

```ts
export const closePeriodSchema = z.object({
  organisation_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const getPeriodSchema = z.object({
  organisation_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type ClosePeriodInput = z.infer<typeof closePeriodSchema>;
export type GetPeriodInput = z.infer<typeof getPeriodSchema>;
```

---

## Server actions (`src/app/actions/v2/reconciliation.ts`)

```
closePeriod(input: ClosePeriodInput): Promise<ActionResult<ReconciliationPeriod>>
  → validate closePeriodSchema
  → requireRole(owner/admin/finance_manager)
  → admin client: check no existing closed period for (org, year, month)
    → if already closed: return { error: 'Period YYYY-MM is already closed' }
  → admin client: aggregate donations for (org, year, month):
      SELECT count(*), sum(amount_pence) FROM donations
      WHERE organisation_id = ? AND EXTRACT(year FROM transaction_date) = year
        AND EXTRACT(month FROM transaction_date) = month
  → admin client: aggregate by appeal:
      SELECT appeal_id, count(*), sum(amount_pence) FROM donations
      WHERE ... AND appeal_id IS NOT NULL
      GROUP BY appeal_id
      → join appeals table to get code + name
  → admin client: insert reconciliation_period (status='closed', counts, summary, closed_by=actorId, closed_at=now())
  → admin client: update donations set status='reconciled'
      WHERE organisation_id = ? AND EXTRACT(year FROM transaction_date) = year
        AND EXTRACT(month FROM transaction_date) = month
        AND status != 'reconciled'
  → audit log: action='reconciliation.period_closed', entity_type='reconciliation_period',
      new_data={ year, month, donation_count, total_pence }
  → return { data: period }

getPeriod(input: GetPeriodInput): Promise<ActionResult<ReconciliationPeriod | null>>
  → validate getPeriodSchema
  → requireRole(owner/admin/finance_manager/auditor)
  → anon client select where (org, year, month)
  → return { data: period | null }

listPeriods(organisation_id: string): Promise<ActionResult<ReconciliationPeriod[]>>
  → requireRole(owner/admin/finance_manager/auditor)
  → anon client select where org, ordered by year desc, month desc
  → return { data: periods }
```

### Internal helper (not exported as server action)

```ts
// src/app/actions/v2/reconciliation.ts — not 'use server' exported
export async function checkPeriodLocked(
  organisation_id: string,
  transaction_date: string  // YYYY-MM-DD
): Promise<boolean>
  → admin client: select id from reconciliation_periods
      WHERE organisation_id = ? AND year = YYYY AND month = MM AND status = 'closed'
  → return true if row exists, false otherwise
```

### Lock enforcement in `imports.ts`

In `importDonations`, per row — before attempting insert:

```ts
const locked = await checkPeriodLocked(input.organisation_id, row.transaction_date);
if (locked) {
  results.push({ source_reference: row.source_reference, status: 'error', error: `Period ${row.transaction_date.slice(0,7)} is closed` });
  errorCount++;
  continue;
}
```

---

## Security rules

1. Periods can only be closed, never re-opened via API
2. No UPDATE or DELETE RLS policy on reconciliation_periods — only admin client mutates
3. Lock checked server-side on every donation import row — not client-enforced
4. Audit log on every period close
5. `checkPeriodLocked` uses admin client to bypass RLS — intentional, internal only

---

## Tests (`src/__tests__/v2/reconciliation.test.ts`)

- `closePeriodSchema` validates correctly (rejects out-of-range month/year, missing fields)
- `getPeriodSchema` validates correctly
- `closePeriod` returns error if period already closed
- `closePeriod` succeeds on empty month (donation_count=0, total_pence=0, summary_by_appeal=[])
- `closePeriod` stores correct count + total_pence
- `closePeriod` writes audit log entry with correct action
- `listPeriods` returns periods ordered newest first
- `checkPeriodLocked` returns true for closed period
- `checkPeriodLocked` returns false for open/nonexistent period
- `importDonations` returns error status for rows targeting a closed period

---

## Exit criteria

- [ ] Finance manager can close a calendar month
- [ ] Closing an empty month succeeds (no error)
- [ ] Closing an already-closed month returns an error
- [ ] Donations in closed period get status='reconciled'
- [ ] Importing donations into a closed period returns per-row error
- [ ] Closed period stores correct totals and appeal breakdown
- [ ] Audit log written on close
- [ ] Auditor can read periods but cannot close
