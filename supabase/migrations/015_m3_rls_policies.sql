-- 015: RLS policies for M3 donation import tables

alter table donation_import_batches enable row level security;

create policy "finance privileged can view import batches"
on donation_import_batches for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

create policy "finance managers can insert import batches"
on donation_import_batches for insert
with check (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager']
  )
);

alter table donations enable row level security;

create policy "finance privileged can view donations"
on donations for select
using (
  public.has_org_role(
    organisation_id,
    array['owner','admin','finance_manager','auditor']
  )
);

-- No insert policy on donations — admin client only

create index if not exists idx_import_batches_org_id on donation_import_batches(organisation_id);
create index if not exists idx_import_batches_org_status on donation_import_batches(organisation_id, status);
create index if not exists idx_donations_org_id on donations(organisation_id);
create index if not exists idx_donations_org_batch on donations(organisation_id, import_batch_id);
create index if not exists idx_donations_org_appeal on donations(organisation_id, appeal_id);
create index if not exists idx_donations_source_ref on donations(organisation_id, source, source_reference);
