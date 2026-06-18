# Changelog

All notable changes to Steward are documented here.

---

## [Unreleased]

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
