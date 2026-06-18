# Demo Shared State — Design Spec
**Date:** 2026-06-18  
**Status:** Approved

## Goal

Make `/demo` fully interactive for both self-serve prospects and live pitch use. All pages share one state so numbers are consistent and live.

---

## Architecture

### `DemoStateContext`
**File:** `src/contexts/DemoStateContext.tsx`

Single React context + `useReducer`. Wraps `/demo/layout.tsx`. All demo pages import `useDemoState()` — no page-level `useState` for core data.

```ts
type DemoState = {
  transactions: Tx[]
  members: Member[]
  givers: Giver[]
  funds: Fund[]
  payrollRan: boolean
}
```

Seed data (the current hardcoded arrays in each page) moves into `INITIAL_STATE` in the context file.

**Actions:**
- `ADD_TX` / `DELETE_TX` / `EDIT_TX`
- `ADD_MEMBER` / `DELETE_MEMBER`
- `ADD_GIVER` / `DELETE_GIVER` / `TOGGLE_GIFT_AID`
- `TRANSFER_FUNDS`
- `SET_PAYROLL_RAN`
- `RESET`

---

## Per-page changes

### Overview (`/demo`)
- Derives KPIs from `transactions`: income = sum of positive pence, expenditure = sum of negative pence, surplus = total.
- Monthly regular income KPI from `givers` (sum of standing order amounts).
- Fund allocation bars from `funds`.
- Recent transactions list from first 5 `transactions`.
- "+ Transaction" button opens add-transaction modal (same form as /transactions page).
- "Generate report" button navigates to `/demo/reports`.

### Transactions (`/demo/transactions`)
- Reads `transactions` from context, dispatches `ADD_TX` / `DELETE_TX` / `EDIT_TX`.
- Delete: trash icon per row, no confirm needed (demo context).
- Edit: click row name → modal pre-filled with existing data.

### Members (`/demo/members`)
- Reads `members` from context, dispatches `ADD_MEMBER` / `DELETE_MEMBER`.
- Delete: "Remove" button in actions column.

### Giving (`/demo/giving`)
- Reads `givers` from context, dispatches `ADD_GIVER` / `DELETE_GIVER` / `TOGGLE_GIFT_AID`.
- Gift Aid reclaim KPI on overview also derives from context givers.

### Funds (`/demo/funds`)
- Reads/writes `funds` via `TRANSFER_FUNDS` dispatch.

### Budget (`/demo/budget`)
- Wires the dead "+ Add line" button — modal, adds row to local budget state (budget is not cross-page data, stays local).

### Payroll (`/demo/payroll`)
- Dispatches `SET_PAYROLL_RAN: true` on run. Overview can show "Payroll processed ✓" badge when true.

### Reports (`/demo/reports`)
- Reads `transactions` from context.
- Groups by category, calculates income/expenditure totals per group.
- Renders styled HTML P&L table.
- "Download" button calls `window.print()` — browser print dialog, print-only CSS hides nav/buttons.
- "Generate report" button in topbar triggers the same print view.

---

## Reset button

Sticky button in demo layout (`/demo/layout.tsx`) topbar area. Dispatches `RESET` → replaces state with `INITIAL_STATE`. Label: "↺ Reset demo". Styled as `btn-outline btn-sm`.

---

## Constraints

- No Supabase calls in demo — all state is client-side only.
- No auth required — demo is public.
- Budget page keeps local state (not shared) — budget vs actual data doesn't feed overview.
- `DemoStateContext` is not used outside `/demo`.

---

## Success criteria

1. Add transaction on `/demo/transactions` → overview surplus updates immediately.
2. Toggle Gift Aid on `/demo/giving` → Gift Aid reclaim KPI updates on same page and is consistent with giving register.
3. Reports page generates real P&L from context transaction data, print works.
4. Delete works on all list pages.
5. Reset restores all pages to seed data in one click.
