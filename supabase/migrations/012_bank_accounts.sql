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
