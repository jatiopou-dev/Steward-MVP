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
