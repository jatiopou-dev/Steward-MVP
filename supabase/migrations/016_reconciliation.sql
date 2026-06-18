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
