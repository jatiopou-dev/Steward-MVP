-- 017: Gift Aid declarations, claims, and claim donations

create table if not exists gift_aid_declarations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  donor_id uuid not null references donors(id) on delete cascade,
  declaration_type text not null check (declaration_type in ('enduring', 'retro', 'single')),
  effective_from date not null,
  effective_to date,
  signed_at timestamptz not null,
  signed_by_name text not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists gift_aid_claims (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  claim_period_from date not null,
  claim_period_to date not null,
  total_donations_pence bigint not null default 0,
  total_gift_aid_pence bigint not null default 0,
  donation_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists gift_aid_claim_donations (
  claim_id uuid not null references gift_aid_claims(id) on delete cascade,
  donation_id uuid not null references donations(id) on delete cascade,
  declaration_id uuid not null references gift_aid_declarations(id),
  gift_aid_pence integer not null,
  primary key (claim_id, donation_id)
);

-- RLS: gift_aid_declarations
alter table gift_aid_declarations enable row level security;

create policy "finance privileged can view declarations"
on gift_aid_declarations for select
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor']));

create policy "finance managers can insert declarations"
on gift_aid_declarations for insert
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

create policy "finance managers can update declarations"
on gift_aid_declarations for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- RLS: gift_aid_claims
alter table gift_aid_claims enable row level security;

create policy "finance privileged can view claims"
on gift_aid_claims for select
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor']));

create policy "finance managers can insert claims"
on gift_aid_claims for insert
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

create policy "finance managers can update claims"
on gift_aid_claims for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- RLS: gift_aid_claim_donations
alter table gift_aid_claim_donations enable row level security;

create policy "finance privileged can view claim donations"
on gift_aid_claim_donations for select
using (
  exists (
    select 1 from gift_aid_claims c
    where c.id = claim_id
    and public.has_org_role(c.organisation_id, array['owner','admin','finance_manager','auditor'])
  )
);

create policy "finance managers can insert claim donations"
on gift_aid_claim_donations for insert
with check (
  exists (
    select 1 from gift_aid_claims c
    where c.id = claim_id
    and public.has_org_role(c.organisation_id, array['owner','admin','finance_manager'])
  )
);

-- Indexes
create index if not exists idx_declarations_org_id on gift_aid_declarations(organisation_id);
create index if not exists idx_declarations_donor_id on gift_aid_declarations(organisation_id, donor_id);
create index if not exists idx_declarations_active on gift_aid_declarations(organisation_id, revoked_at) where revoked_at is null;
create index if not exists idx_claims_org_id on gift_aid_claims(organisation_id);
create index if not exists idx_claim_donations_claim_id on gift_aid_claim_donations(claim_id);
create index if not exists idx_claim_donations_donation_id on gift_aid_claim_donations(donation_id);
