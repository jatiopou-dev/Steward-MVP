-- 011: Appeals and donors for M2 Finance Setup

create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  external_account_code text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_appeal_code unique (organisation_id, code)
);

create table if not exists donors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  display_name text not null,
  email text,
  external_reference text,
  gift_aid_eligible boolean default false,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
