# Changelog

All notable changes to Steward are documented here.

---

## [M5] — 2026-06-18 — Gift Aid (backend pipeline)

### Database (migration 017)
- `gift_aid_declarations` — donor Gift Aid declarations with type, date range, signed name, revocation timestamp
  - `declaration_type`: `enduring` (open-ended), `retro` (historical coverage), `single` (one donation)
  - `effective_from` / `effective_to` (nullable) — date range covered
  - `revoked_at` (nullable) — soft-revoke only; never hard-deleted for HMRC audit trail
  - RLS: SELECT for owner/admin/finance_manager/auditor; INSERT/UPDATE for owner/admin/finance_manager
- `gift_aid_claims` — HMRC claim batches
  - `status`: `draft` → `submitted`; once submitted, immutable
  - Stores `total_donations_pence`, `total_gift_aid_pence`, `donation_count` as running totals
  - `submitted_at` / `submitted_by` recorded on submission
  - RLS: SELECT for owner/admin/finance_manager/auditor; INSERT/UPDATE for owner/admin/finance_manager
- `gift_aid_claim_donations` — join table linking donations to claims
  - `gift_aid_pence` stored per row (= `ROUND(amount_pence × 25 / 100)`)
  - `declaration_id` recorded for each row — full audit trail of which declaration covered which donation
  - RLS derived from parent claim's organisation_id
- Indexes: org, donor, active-declarations partial index (WHERE revoked_at IS NULL), claim donations

### Server actions (`src/app/actions/v2/giftAid.ts`)
- `createDeclaration` — validates `CreateDeclarationInput`, verifies donor exists in org and has `gift_aid_eligible = true`, inserts declaration, writes audit log `gift_aid.declaration_created`
- `revokeDeclaration` — guards against double-revoke, sets `revoked_at = now()`, writes audit log `gift_aid.declaration_revoked`; declaration remains in DB
- `listDeclarations` — read-only, accessible by auditor role; optional `donor_id` filter; ordered by `created_at desc`
- `createClaim` — scans all donations in date range, cross-references gift-aid-eligible donors and active declarations, excludes donations already in a **submitted** claim, calculates `gift_aid_pence` per donation, inserts `gift_aid_claims` + all `gift_aid_claim_donations` rows, writes audit log `gift_aid.claim_created`
- `submitClaim` — verifies claim is `draft`, fetches donation details for CSV, updates claim to `submitted`, generates HMRC CSV, writes audit log `gift_aid.claim_submitted`, returns `SubmitClaimResult` with claim + summary + csv string

### Pure helpers (`src/lib/giftAid/`)
- `buildCharitiesOnlineCsv(rows)` — generates HMRC Charities Online bulk upload CSV
  - 7 columns: Donor title, Donor first name, Donor last name, House name or number, Postcode, Donation date, Donation amount
  - Name split on first space: `"Mary Jane Watson"` → first=`Mary`, last=`Jane Watson`; single-word names get blank last name
  - Amount formatted as `"50.00"` (pence ÷ 100, 2 decimal places, no currency symbol)
  - Title, house, postcode left blank (not stored in Steward)
- `isDeclarationActive(declaration, transaction_date)` — pure coverage check
  - Returns `false` if revoked, if `effective_from > transaction_date`, or if `effective_to < transaction_date`
  - Boundary-inclusive: `effective_from === transaction_date` and `effective_to === transaction_date` both return `true`

### Validation (`src/lib/validation/v2.ts`)
- `createDeclarationSchema` — uuid org/donor, enum declaration_type, YYYY-MM-DD dates, ISO datetime signed_at, signed_by_name min 1 max 200
- `revokeDeclarationSchema` — uuid org + declaration_id
- `listDeclarationsSchema` — uuid org, optional uuid donor_id
- `createClaimSchema` — uuid org, YYYY-MM-DD from/to, refine: from ≤ to
- `submitClaimSchema` — uuid org + claim_id
- Inferred TypeScript types: `CreateDeclarationInput`, `RevokeDeclarationInput`, `ListDeclarationsInput`, `CreateClaimInput`, `SubmitClaimInput`

### TypeScript types (`src/lib/types/v2.ts`)
- `DeclarationType` — `'enduring' | 'retro' | 'single'`
- `ClaimStatus` — `'draft' | 'submitted'`
- `GiftAidDeclaration`, `GiftAidClaim`, `GiftAidClaimDonation`
- `ClaimSummary` — claim + donation_count + total_donations_pence + total_gift_aid_pence
- `SubmitClaimResult` — claim + summary + csv string

### Tests (`src/__tests__/v2/giftAid.test.ts`)
- 27 new tests (104 total across 6 test files)
- `createDeclarationSchema`: valid enduring/retro, rejects missing name, empty name, invalid date format, invalid declaration_type
- `createClaimSchema`: valid range, same-day range, rejects from > to (refine), invalid date format
- `revokeDeclarationSchema`: valid, rejects non-uuid
- `submitClaimSchema`: valid
- `isDeclarationActive`: 7 boundary-condition cases covering revocation, before/after/on effective dates
- `buildCharitiesOnlineCsv`: empty rows (header only), single row full column check, multi-word last name, single-word name, pence formatting (5000→50.00, 101→1.01), multiple rows length

### Security
- Donor `gift_aid_eligible` flag must be `true` — declaration alone is not sufficient
- Donations in **submitted** claims cannot be re-claimed; draft claims do not block
- Declarations never hard-deleted — `revoked_at` soft-revoke preserves HMRC audit trail
- All writes via admin client (service role); reads via anon client (RLS enforced)
- Audit log on every declaration create/revoke and every claim create/submit
- `gift_aid_pence` stored as integer; formula `ROUND(amount_pence × 25.0 / 100.0)` — no floats

---

## [M4] — 2026-06-18 — Period-Close Reconciliation (backend pipeline)

### Database (migration 016)
- `reconciliation_periods` — one row per (organisation, year, month)
  - `status`: `open` | `closed` — soft lock only; no hard delete or reopen via API
  - `donation_count`, `total_pence` (bigint) — aggregated at close time
  - `summary_by_appeal` (jsonb) — array of `{ appeal_id, appeal_code, appeal_name, count, total_pence }` per appeal
  - `closed_by` (auth.users ref), `closed_at` timestamptz — recorded on close
  - Unique constraint on `(organisation_id, year, month)` — one period per calendar month per org
  - RLS: SELECT for owner/admin/finance_manager/auditor; INSERT for owner/admin/finance_manager; no UPDATE/DELETE policy (admin client only)
- Index added on `donations(organisation_id, transaction_date)` — used by close and lock-check queries

### Server actions (`src/app/actions/v2/reconciliation.ts`)
- `closePeriod(input)` — validates, checks caller role (finance_manager+), verifies period not already closed, aggregates all donations for the month, builds per-appeal summary by joining `appeals` table, upserts `reconciliation_periods` row, bulk-updates matching donations to `status='reconciled'`, writes audit log `reconciliation.period_closed`
  - Empty months (zero donations) close successfully — `donation_count=0` is valid
  - If bulk donation status update fails after period is closed, returns descriptive error rather than silently succeeding
- `getPeriod(input)` — anon client (RLS), read roles, returns period or null
- `listPeriods(organisation_id)` — anon client (RLS), returns all periods ordered `year desc, month desc`
- `checkPeriodLocked(organisation_id, transaction_date)` — internal helper (not a server action endpoint), admin client, parses YYYY-MM-DD, returns `true` if a closed period exists for that calendar month

### Lock enforcement (`src/app/actions/v2/imports.ts`)
- `importDonations` now calls `checkPeriodLocked` per row before attempting insert
- Rows targeting a closed period are rejected immediately: `status: 'error'`, message: `"Period YYYY-MM is closed"`
- Other rows in the same batch continue processing — lock is per-row, not per-batch

### Validation (`src/lib/validation/v2.ts`)
- `closePeriodSchema` — uuid org, year int 2000–2100, month int 1–12
- `getPeriodSchema` — same shape
- Inferred types: `ClosePeriodInput`, `GetPeriodInput`

### TypeScript types (`src/lib/types/v2.ts`)
- `PeriodStatus` — `'open' | 'closed'`
- `AppealSummary` — `{ appeal_id, appeal_code, appeal_name, count, total_pence }`
- `ReconciliationPeriod` — full period row including nullable `closed_by`, `closed_at`, `summary_by_appeal`

### Tests (`src/__tests__/v2/reconciliation.test.ts`)
- 77 tests total at end of M4 (across all test files)
- `closePeriodSchema`: invalid year/month ranges, missing fields
- `getPeriodSchema`: valid inputs
- `lastDayOfMonth` boundary tests: leap year Feb, Dec→Jan rollover, UTC safety

### Security
- Periods closed only once — already-closed returns error, no silent overwrite
- No UPDATE or DELETE RLS policy on `reconciliation_periods` — only admin client can mutate
- `checkPeriodLocked` uses admin client intentionally — bypasses RLS for internal server-side check only
- Lock enforced server-side per import row — cannot be bypassed client-side
- Audit log on every period close

---

## [M3] — 2026-06-18 — Donation Imports (backend pipeline)

### Database (migrations 014–015)
- `donation_import_batches` — one row per import operation
  - `source`: `bank_csv` | `stripe` — identifies the import format
  - `status`: `processing` → `complete` | `failed`
  - `total_rows`, `success_count`, `error_count` — populated after processing
  - `imported_by` (auth.users ref), `created_at`
  - RLS: SELECT/INSERT for owner/admin/finance_manager; no viewer/assistant access
- `donations` — individual donation records
  - `source_reference` — original ID from source system (bank ref, Stripe charge ID)
  - `transaction_date` (date), `amount_pence` (integer — no floats ever)
  - `donor_id` (nullable FK to donors — matched post-import), `appeal_id` (nullable FK)
  - `status`: `imported` → `matched` → `reconciled`
  - `raw_row` (jsonb) — original CSV row preserved verbatim, never mutated
  - `batch_id` FK to `donation_import_batches`
  - Unique constraint on `(organisation_id, source, source_reference)` — prevents duplicate imports
  - RLS: same as batches — no viewer access

### Column maps (`src/lib/importMaps/`)
- `bankCsv.ts` — generic UK bank CSV parser; maps columns: Date, Description, Amount, Reference → internal row shape; handles debit/credit sign convention
- `stripe.ts` — Stripe dashboard export parser; maps: `created`, `description`, `amount`, `id` → internal row shape; converts Stripe cents (already integer) to pence

### Server actions (`src/app/actions/v2/imports.ts`)
- `createImportBatch(input)` — validates source, inserts batch row with `status='processing'`, returns batch record
- `importDonations(input)` — processes array of `ImportDonationRow`, per row:
  1. Validates row schema (Zod)
  2. Checks period lock (`checkPeriodLocked`) — rejects if month is closed
  3. Resolves `appeal_id` from `appeal_code` if provided
  4. Inserts donation via admin client; on unique-constraint violation returns `duplicate` status (not error)
  5. Accumulates `success_count` / `error_count`; updates batch to `complete`/`failed`
  6. Writes audit log `import.completed` with totals
  Returns `ImportBatchResult` with per-row `ImportRowResult` array
- `listImportBatches(organisation_id)` — anon client, read roles, ordered `created_at desc`
- `listDonations(input)` — anon client, filterable by `batch_id`, `status`, `appeal_id`, `donor_id`

### Validation (`src/lib/validation/v2.ts`)
- `createImportBatchSchema` — uuid org, enum source
- `importDonationRowSchema` — source_reference string, transaction_date YYYY-MM-DD, amount_pence positive integer, optional appeal_code/donor_id/notes
- `importDonationsSchema` — uuid org + batch_id, array of rows
- `listDonationsSchema` — uuid org, optional filters
- Inferred types: `CreateImportBatchInput`, `ImportDonationRow`, `ImportDonationsInput`, `ListDonationsInput`

### TypeScript types (`src/lib/types/v2.ts`)
- `ImportSource` — `'bank_csv' | 'stripe'`
- `ImportBatchStatus` — `'processing' | 'complete' | 'failed'`
- `DonationStatus` — `'imported' | 'matched' | 'reconciled'`
- `DonationImportBatch`, `Donation` — full row types
- `ImportRowResult` — `{ source_reference, status: 'success'|'error'|'duplicate', error? }`
- `ImportBatchResult` — `{ batch, rows: ImportRowResult[], success_count, error_count }`

### Tests (`src/__tests__/v2/imports.test.ts`)
- 61 tests at end of M3
- `createImportBatchSchema`, `importDonationRowSchema`, `importDonationsSchema`, `listDonationsSchema` — full validation coverage
- Column map pure functions: correct field mapping, sign handling, reference extraction

### Security
- Donations inserted via admin client only — no client-facing RLS INSERT policy on donations
- Unique constraint prevents duplicate re-imports silently returning `duplicate` per row
- `raw_row` jsonb preserved verbatim — immutable after insert
- `amount_pence` integer only — no floats stored
- Audit log on every completed batch
- Period lock check enforced server-side per row — cannot be bypassed

---

## [M2] — 2026-06-18 — Finance Setup (backend pipeline)

### Database (migrations 011–013)
- `appeals` — fundraising campaigns / giving funds
  - `code` (unique per org), `name`, `description`, `status`: `active` | `archived`
  - RLS: SELECT for all org members; INSERT/UPDATE for owner/admin/finance_manager
- `donors` — individual donor records
  - `display_name`, `email` (nullable), `gift_aid_eligible` (boolean, default false)
  - `status`: `active` | `archived`
  - RLS: SELECT/INSERT/UPDATE for owner/admin/finance_manager/finance_assistant
- `bank_accounts` — org bank account records
  - `account_name`, `sort_code`, `account_number` (last 4 only), `bank_name`
  - `status`: `active` | `archived`
  - RLS: SELECT for finance_manager+; INSERT/UPDATE for owner/admin only
- RLS migration 013 applies all policies; `organisation_id` on every table

### Server actions (`src/app/actions/v2/appeals.ts`)
- `createAppeal` — role: finance_manager+; inserts appeal; writes audit log `appeal.created`
- `getAppeal` — role: any member; returns single appeal by id
- `listAppeals` — role: any member; returns all org appeals ordered by name
- `updateAppeal` — role: finance_manager+; validates fields; writes audit log `appeal.updated`
- `archiveAppeal` — role: finance_manager+; sets `status='archived'`; writes audit log `appeal.archived`

### Server actions (`src/app/actions/v2/donors.ts`)
- `createDonor` — role: finance_assistant+; inserts donor; writes audit log `donor.created`
- `getDonor` — role: finance_assistant+; returns single donor
- `listDonors` — role: finance_assistant+; returns all active donors ordered by name
- `updateDonor` — role: finance_assistant+; validates fields; writes audit log `donor.updated`

### Server actions (`src/app/actions/v2/bankAccounts.ts`)
- `createBankAccount` — role: owner/admin only; inserts bank account
- `listBankAccounts` — role: finance_manager+; returns all active accounts
- `updateBankAccount` — role: owner/admin only; validates fields

### Validation (`src/lib/validation/v2.ts`)
- `createAppealSchema` — org uuid, code (min 1, max 20), name (min 1, max 200), optional description
- `updateAppealSchema` — same fields, all optional (partial update)
- `createDonorSchema` — org uuid, display_name, optional email (validated format), gift_aid_eligible boolean
- `updateDonorSchema` — partial
- `createBankAccountSchema` — org uuid, account_name, sort_code (6 digits), account_number (8 digits), bank_name
- `updateBankAccountSchema` — partial

### TypeScript types (`src/lib/types/v2.ts`)
- `AppealStatus`, `DonorStatus`, `BankAccountStatus` — `'active' | 'archived'`
- `Appeal`, `Donor`, `BankAccount` — full row types

### Tests
- Zod schema unit tests for all 6 schemas — valid inputs, invalid inputs, boundary cases

### Security
- No hard deletes — `status='archived'` enforced on all three entities
- Bank account numbers never stored in full — sort_code + last 4 digits only
- Audit log on appeal create/update/archive and donor create/update
- Role checks server-side on every mutation — never client-enforced

---

## [M1] — 2026-06-18 — Multi-tenant Foundation (backend pipeline)

### Database (migrations 007–010)
- `organisations` — top-level tenant entity
  - `org_type`: `denomination` | `network` | `conference` | `church` | `ministry` — hierarchical church structure support
  - `status`: `active` | `archived` | `suspended`
  - `slug` (unique), `name`, `settings` (jsonb for denomination config)
- `memberships` — user-to-org join table
  - `role`: `owner` | `admin` | `finance_manager` | `finance_assistant` | `viewer` | `auditor`
  - `status`: `invited` → `active` | `disabled`
  - `invited_by` (auth.users ref), `activated_at`
- `audit_logs` — immutable event log scoped to org
  - `action` (string e.g. `org.created`, `member.role_changed`), `entity_type`, `entity_id`
  - `actor_user_id`, `old_data` (jsonb), `new_data` (jsonb), `created_at`
  - No DELETE RLS policy — append-only by design
- `profiles` — public user profile linked to `auth.users`
- RLS helper functions (security-definer, bypasses RLS for internal checks):
  - `public.is_org_member(org_id)` — returns true if caller has any active membership
  - `public.has_org_role(org_id, roles[])` — returns true if caller's role is in the provided array
- RLS policies on `profiles`, `organisations`, `memberships`, `audit_logs` — all tenant-scoped

### Infrastructure
- `src/utils/supabase/admin.ts` — synchronous `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`; service-role key never exposed to client
- `src/utils/supabase/server.ts` — async `createClient()` using SSR auth helpers; anon key, RLS enforced
- Vitest v4 test framework installed; `@` alias configured to `src/`; node environment

### Server actions (`src/app/actions/v2/organisations.ts`)
- `createOrganisation` — inserts org + auto-creates `owner` membership for caller; writes audit log `org.created`
- `getOrganisation` — anon client (RLS); returns org if caller is member
- `listUserOrganisations` — returns all orgs the caller has active membership in

### Server actions (`src/app/actions/v2/memberships.ts`)
- `inviteUser` — role: admin+; creates `invited` membership; writes audit log `member.invited`
- `activateMembership` — called by invitee; sets membership `active`; writes audit log `member.activated`
- `updateMemberRole` — role: admin+; cannot demote self; writes audit log `member.role_changed` with old + new role
- `removeMember` — role: admin+; cannot remove self; sets `disabled`; writes audit log `member.removed`
- `listMembers` — returns all active + invited members for org

### Audit log helper (`src/app/actions/v2/audit.ts`)
- `createAuditLog({ organisation_id, actor_user_id, action, entity_type, entity_id, old_data?, new_data? })` — writes via admin client (bypasses RLS); used by all v2 server actions

### Validation (`src/lib/validation/v2.ts`)
- `createOrganisationSchema` — name, slug (kebab-case), org_type enum
- `inviteMemberSchema` — org uuid, email, role enum
- `updateMemberRoleSchema` — org uuid, membership uuid, new role enum
- `removeMemberSchema` — org uuid, membership uuid
- Inferred types: `CreateOrganisationInput`, `InviteMemberInput`, `UpdateMemberRoleInput`, `RemoveMemberInput`

### TypeScript types (`src/lib/types/v2.ts`)
- `OrgType`, `OrgStatus`, `MemberRole`, `MemberStatus`
- `Organisation`, `Membership`, `AuditLog`
- `ActionResult<T>` — `{ data: T } | { error: string }` — standard return type for all server actions

### Tests (`src/__tests__/v2/organisations.test.ts`, `memberships.test.ts`)
- 11 passing tests at end of M1
- Schema validation: valid inputs, invalid slugs, invalid role enums, uuid validation

### Security
- All membership mutations verify caller role server-side — no client-enforced checks
- Owners cannot demote or remove themselves — guard in `updateMemberRole` and `removeMember`
- RLS blocks all cross-tenant reads at DB layer
- Service-role key server-side only; never in any client bundle
- Audit log inserts use admin client — no client-facing INSERT policy on `audit_logs`

---

## [Unreleased]

### Changed — 2026-06-18
- public/sw.js
- src/app/actions/funds.ts
- src/app/actions/giving.ts
- src/app/actions/organizations.ts
- src/app/actions/transactions.ts
- src/app/api/reconcile/route.ts
- src/app/dashboard/funds/FundForm.tsx
- src/app/dashboard/giving/new/page.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/transactions/[id]/edit/EditTransactionForm.tsx
- src/app/dashboard/transactions/[id]/edit/page.tsx
- src/app/dashboard/transactions/import/page.tsx
- src/app/dashboard/transactions/new/page.tsx
- src/app/dashboard/transactions/page.tsx
- src/app/demo/budget/page.tsx


### Changed
- Ongoing: production hardening, performance, additional denomination presets

---

## [0.8.0] — 2026-04-27

### Added
- Full fund accounts CRUD — create, edit, delete funds with live allocation on overview
- Dashboard overview wired to real Supabase data (live KPIs, transaction feed, fund allocation)
- Full member CRUD — add, edit, delete members via Supabase server actions
- Full transaction CRUD — add, edit, delete transactions via Supabase server actions
- Giving records wired to real member records; Gift Aid eligibility derived from live data

### Fixed
- Next.js server action export rules satisfied — all `"use server"` actions in dedicated modules
- Middleware refactored to proxy convention to satisfy Next.js 16 routing rules
- Removed legacy middleware filename causing build warnings

---

## [0.7.0] — 2026-04-14

### Added
- Public `/demo` mode — 9 fully interactive pages with no auth required; demo banner visible throughout
- Live denomination engine switcher in `/demo` — sidebar labels, overview cards, and settings update in real-time
- "vs Legacy Systems" comparison section on landing page — Steward vs ACMS vs ChurchPal 4
- Onboarding, dashboard, and settings wired to backend (organisation record, denomination config, user profile)

### Fixed
- Landing page nav anchors and pricing CTA buttons now correctly route to `/auth`
- Vercel build errors resolved — `@react-pdf/renderer` ESM transpiled; Stripe lazy-initialised in webhook handler

---

## [0.6.0] — 2026-04-14

### Added
- **Phase 7 UK Automation**
  - Bank reconciliation AI — upload OFX/CSV statement, Claude matches transactions automatically
  - PDF donor statement generator — end-of-year giving statements via `@react-pdf/renderer`
  - `/api/reconcile` route for AI-powered bank statement matching

---

## [0.5.0] — 2026-04-09

### Added
- **Phase 5 HMRC Gift Aid engine**
  - Gift Aid eligibility tracking per member
  - HMRC R68 report generation
  - Eligible giving totals with 25% reclaim calculation
- **Phase 4 APIs**
  - `/api/chat` — Claude AI assistant with church-context system prompt
  - `/api/checkout` — Stripe Checkout session creation
  - `/api/webhooks/stripe` — Stripe webhook handler for subscription lifecycle
  - Server actions for transactions, members, giving, funds, organisations
- Serwist PWA infrastructure — service worker, web app manifest, offline capability
- Live Supabase SSR authentication — sign in/up, session persistence, protected routes

### Fixed
- AI SDK type compilation errors
- `useChat` replaced with custom stream hook to fix Vercel streaming build failure

---

## [0.4.0] — 2026-04-08

### Added
- **Phase 3: Dashboard and Denomination Engine MVP**
  - 9-tab authenticated dashboard: Overview, Transactions, Funds, Budget, Payroll, Giving, Members, AI, Reports
  - Denomination engine — per-denomination terminology (Baptist, Anglican, Methodist, Pentecostal, Catholic, Adventist, Presbyterian, Independent)
  - Denomination context provider (`DenominationContext`) with real-time label switching
  - Settings page with one-click denomination preset buttons
  - Sidebar and Topbar components wired to denomination context

---

## [0.1.0] — 2026-04-08

### Added
- Initial Next.js 16 project scaffold (`create-next-app`)
- Supabase client utilities (SSR + session helpers)
- Base Tailwind CSS v4 + PostCSS config
- ESLint config for Next.js
- PWA manifest stub

---

## Product History (pre-code)

The following milestones predate the git history and are documented in
`../Steward - Full Build Conversation.md`.

| Date | Milestone |
|------|-----------|
| 2026-04-08 | Concept — church finance SaaS brainstorm; AI Bookkeeping for Nonprofits selected |
| 2026-04-08 | First prototype — `steward-ai.html` single-file MVP (terracotta theme, Claude API, Stripe-ready) |
| 2026-04-08 | Pivot — ACMS rival spec; `clearledger-mvp.html` built with 9 dashboard tabs, payroll, remittance, Gift Aid |
| 2026-04-08 | Rebrand — product named **Steward**; forest green + gold palette; denomination engine designed |
| 2026-04-08 | `steward.html` — full single-file rebrand with denomination pills, comparison table, pricing |
| 2026-04-08 | Pricing set: Seed £29/mo · Church £69/mo · Network £199/mo |
| 2026-04-08 | Tech stack decided: Next.js + Supabase + Claude API + Stripe + Vercel + PWA |
