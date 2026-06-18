-- 018: Web3 — crypto import source + blockchain audit anchoring

-- Add 'crypto' to import source check constraints
alter table donation_import_batches
  drop constraint if exists donation_import_batches_source_check;
alter table donation_import_batches
  add constraint donation_import_batches_source_check
    check (source in ('bank_csv', 'stripe', 'crypto'));

alter table donations
  drop constraint if exists donations_source_check;
alter table donations
  add constraint donations_source_check
    check (source in ('bank_csv', 'stripe', 'crypto'));

-- Add anchor_tx_hash to reconciliation_periods
alter table reconciliation_periods
  add column if not exists anchor_tx_hash text;

-- chain_anchors: one row per anchored period
create table if not exists chain_anchors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  period_id uuid not null references reconciliation_periods(id),
  chain text not null check (chain in ('polygon', 'base')),
  chain_id integer not null,
  tx_hash text not null,
  block_number bigint not null,
  anchor_hash text not null,
  anchor_data jsonb not null,
  prev_anchor_tx_hash text,
  anchored_at timestamptz not null default now(),
  anchored_by uuid references auth.users(id)
);

alter table chain_anchors enable row level security;

create policy "org members can view anchors"
on chain_anchors for select
using (public.is_org_member(organisation_id));

-- No INSERT/UPDATE/DELETE RLS — admin client only

create index if not exists idx_chain_anchors_org on chain_anchors(organisation_id);
create index if not exists idx_chain_anchors_period on chain_anchors(period_id);
