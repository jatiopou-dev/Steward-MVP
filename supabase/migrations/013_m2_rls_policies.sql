-- 013: RLS policies for M2 finance tables
-- Depends on is_org_member() and has_org_role() from migration 008

-- appeals: all members can read; finance_manager+ can mutate
alter table appeals enable row level security;

create policy "members can view appeals"
on appeals for select
using (public.is_org_member(organisation_id));

create policy "finance users can insert appeals"
on appeals for insert
with check (
  public.has_org_role(organisation_id, array['owner','admin','finance_manager'])
);

create policy "finance users can update appeals"
on appeals for update
using (public.has_org_role(organisation_id, array['owner','admin','finance_manager']))
with check (public.has_org_role(organisation_id, array['owner','admin','finance_manager']));

-- donors: restricted read (not viewer-accessible — contains personal data)
alter table donors enable row level security;

create policy "finance members can view donors"
on donors for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant','auditor']
  )
);

create policy "finance users can insert donors"
on donors for insert
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
);

create policy "finance users can update donors"
on donors for update
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
)
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','finance_assistant']
  )
);

-- bank_accounts: privileged read only
alter table bank_accounts enable row level security;

create policy "finance privileged can view bank accounts"
on bank_accounts for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

create policy "owners and admins can insert bank accounts"
on bank_accounts for insert
with check (
  public.has_org_role(organisation_id, array['owner','admin'])
);

create policy "owners and admins can update bank accounts"
on bank_accounts for update
using (public.has_org_role(organisation_id, array['owner','admin']))
with check (public.has_org_role(organisation_id, array['owner','admin']));

-- Indexes
create index if not exists idx_appeals_org_id on appeals(organisation_id);
create index if not exists idx_appeals_org_status on appeals(organisation_id, status);
create index if not exists idx_donors_org_id on donors(organisation_id);
create index if not exists idx_bank_accounts_org_id on bank_accounts(organisation_id);
