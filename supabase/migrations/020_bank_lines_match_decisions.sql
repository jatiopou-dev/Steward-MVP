-- 020: Bank statement lines and treasurer match decisions
--
-- bank_lines holds imported bank statement lines. match_decisions records each
-- treasurer decision on a suggested bank line ↔ donation pair; nothing is
-- deleted, an undo stamps undone_at/undone_by. A donation counts as
-- bank-matched while it has an active (not undone) accepted decision;
-- donations.status is deliberately left alone.
--
-- Writes go only through accept_bank_match, reject_bank_match and
-- undo_match_decision, called by server actions with the service role.

create table if not exists bank_lines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id) on delete cascade,
  source_reference text not null,
  transaction_date date not null,
  amount_pence integer not null check (amount_pence <> 0),
  currency text not null default 'GBP',
  reference text,
  counterparty_name text,
  raw_row jsonb not null default '{}'::jsonb,
  status text not null default 'unmatched' check (status in ('unmatched', 'matched')),
  created_at timestamptz not null default now(),
  constraint unique_bank_line_source unique (bank_account_id, source_reference)
);

create table if not exists match_decisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  bank_line_id uuid not null references bank_lines(id) on delete cascade,
  donation_id uuid not null references donations(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'rejected')),
  -- Shared by both lines of an accepted split; null otherwise.
  split_group_id uuid,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  reasons text[] not null default '{}',
  decided_by uuid references auth.users(id),
  decided_at timestamptz not null default now(),
  undone_by uuid references auth.users(id),
  undone_at timestamptz
);

-- A bank line has at most one active accepted match.
create unique index if not exists uniq_match_decisions_active_accept
  on match_decisions(bank_line_id)
  where decision = 'accepted' and undone_at is null;

-- A pair is rejected at most once at a time.
create unique index if not exists uniq_match_decisions_active_reject
  on match_decisions(bank_line_id, donation_id)
  where decision = 'rejected' and undone_at is null;

create index if not exists idx_bank_lines_org_status_date
  on bank_lines(organisation_id, status, transaction_date);
create index if not exists idx_bank_lines_bank_account on bank_lines(bank_account_id);
create index if not exists idx_match_decisions_org on match_decisions(organisation_id);
create index if not exists idx_match_decisions_donation on match_decisions(donation_id);
create index if not exists idx_match_decisions_split_group
  on match_decisions(split_group_id) where split_group_id is not null;

-- RLS: privileged roles read; no insert/update/delete policies.
alter table bank_lines enable row level security;
alter table match_decisions enable row level security;

create policy "finance privileged can view bank lines"
on bank_lines for select
using (
  public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor'])
);

create policy "finance privileged can view match decisions"
on match_decisions for select
using (
  public.has_org_role(organisation_id, array['owner','admin','finance_manager','auditor'])
);

create or replace function public.is_period_closed(p_organisation_id uuid, p_date date)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from reconciliation_periods
    where organisation_id = p_organisation_id
      and year = extract(year from p_date)::int
      and month = extract(month from p_date)::int
      and status = 'closed'
  );
$$;

-- Accept one bank line, or two lines forming a split, as the match for a donation.
-- Rules: lines are open money-in lines within 5 days of the donation; one line
-- may differ from the donation by up to 5%, two lines must sum exactly; the
-- donation has no active match; no date involved is in a closed period.
create or replace function public.accept_bank_match(
  p_organisation_id uuid,
  p_donation_id uuid,
  p_bank_line_ids uuid[],
  p_actor_id uuid,
  p_confidence numeric default null,
  p_reasons text[] default '{}'
)
returns setof match_decisions
language plpgsql
set search_path = public
as $$
declare
  d donations%rowtype;
  n integer := coalesce(array_length(p_bank_line_ids, 1), 0);
  total bigint;
  grp uuid;
begin
  if n not between 1 and 2 or (select count(distinct x) from unnest(p_bank_line_ids) x) <> n then
    raise exception 'A match needs one bank line, or two different lines for a split';
  end if;

  select * into d from donations
  where id = p_donation_id and organisation_id = p_organisation_id
  for update;
  if not found then raise exception 'Donation not found'; end if;

  perform 1 from bank_lines
  where id = any(p_bank_line_ids) and organisation_id = p_organisation_id
  order by id
  for update;

  if (select count(*) from bank_lines
      where id = any(p_bank_line_ids) and organisation_id = p_organisation_id) <> n then
    raise exception 'Bank line not found';
  end if;
  if exists (select 1 from bank_lines where id = any(p_bank_line_ids) and status <> 'unmatched') then
    raise exception 'Bank line is already matched';
  end if;
  if exists (select 1 from bank_lines where id = any(p_bank_line_ids) and amount_pence <= 0) then
    raise exception 'Only money-in bank lines can match a donation';
  end if;
  if exists (select 1 from bank_lines where id = any(p_bank_line_ids)
             and abs(transaction_date - d.transaction_date) > 5) then
    raise exception 'Bank line date is more than 5 days from the donation date';
  end if;

  select sum(amount_pence) into total from bank_lines where id = any(p_bank_line_ids);
  if n = 2 and total <> d.amount_pence then
    raise exception 'Split lines must add up exactly to the donation amount';
  end if;
  if n = 1 and abs(total - d.amount_pence) > d.amount_pence * 0.05 then
    raise exception 'Bank line amount is more than 5%% from the donation amount';
  end if;

  if exists (select 1 from match_decisions
             where donation_id = d.id and decision = 'accepted' and undone_at is null) then
    raise exception 'Donation is already matched';
  end if;
  if public.is_period_closed(p_organisation_id, d.transaction_date)
     or exists (select 1 from bank_lines where id = any(p_bank_line_ids)
                and public.is_period_closed(p_organisation_id, transaction_date)) then
    raise exception 'Cannot change matches in a closed period';
  end if;

  if n = 2 then grp := gen_random_uuid(); end if;

  update bank_lines set status = 'matched' where id = any(p_bank_line_ids);

  return query
  insert into match_decisions
    (organisation_id, bank_line_id, donation_id, decision, split_group_id, confidence, reasons, decided_by)
  select p_organisation_id, x, d.id, 'accepted', grp, p_confidence, coalesce(p_reasons, '{}'), p_actor_id
  from unnest(p_bank_line_ids) x
  returning *;
end;
$$;

-- Reject a suggested pair so it is not suggested again.
create or replace function public.reject_bank_match(
  p_organisation_id uuid,
  p_bank_line_id uuid,
  p_donation_id uuid,
  p_actor_id uuid,
  p_confidence numeric default null,
  p_reasons text[] default '{}'
)
returns match_decisions
language plpgsql
set search_path = public
as $$
declare
  line bank_lines%rowtype;
  donation_date date;
  result match_decisions%rowtype;
begin
  select * into line from bank_lines
  where id = p_bank_line_id and organisation_id = p_organisation_id
  for update;
  if not found then raise exception 'Bank line not found'; end if;
  if line.status <> 'unmatched' then raise exception 'Bank line is already matched'; end if;

  select transaction_date into donation_date from donations
  where id = p_donation_id and organisation_id = p_organisation_id;
  if not found then raise exception 'Donation not found'; end if;

  if public.is_period_closed(p_organisation_id, donation_date)
     or public.is_period_closed(p_organisation_id, line.transaction_date) then
    raise exception 'Cannot change matches in a closed period';
  end if;
  if exists (select 1 from match_decisions
             where bank_line_id = p_bank_line_id and donation_id = p_donation_id
               and decision = 'rejected' and undone_at is null) then
    raise exception 'This match has already been rejected';
  end if;

  insert into match_decisions
    (organisation_id, bank_line_id, donation_id, decision, confidence, reasons, decided_by)
  values
    (p_organisation_id, p_bank_line_id, p_donation_id, 'rejected', p_confidence, coalesce(p_reasons, '{}'), p_actor_id)
  returning * into result;
  return result;
end;
$$;

-- Undo a decision. Undoing either line of an accepted split undoes both.
create or replace function public.undo_match_decision(
  p_organisation_id uuid,
  p_decision_id uuid,
  p_actor_id uuid
)
returns setof match_decisions
language plpgsql
set search_path = public
as $$
declare
  dec match_decisions%rowtype;
  ids uuid[];
begin
  select * into dec from match_decisions
  where id = p_decision_id and organisation_id = p_organisation_id
  for update;
  if not found then raise exception 'Match decision not found'; end if;
  if dec.undone_at is not null then raise exception 'This decision has already been undone'; end if;

  select array_agg(id) into ids from match_decisions
  where undone_at is null
    and (id = dec.id or (dec.decision = 'accepted' and split_group_id = dec.split_group_id));

  if exists (select 1 from match_decisions m
             join bank_lines b on b.id = m.bank_line_id
             join donations d on d.id = m.donation_id
             where m.id = any(ids)
               and (public.is_period_closed(p_organisation_id, b.transaction_date)
                    or public.is_period_closed(p_organisation_id, d.transaction_date))) then
    raise exception 'Cannot change matches in a closed period';
  end if;

  if dec.decision = 'accepted' then
    update bank_lines set status = 'unmatched'
    where id in (select bank_line_id from match_decisions where id = any(ids));
  end if;

  return query
  update match_decisions set undone_at = now(), undone_by = p_actor_id
  where id = any(ids)
  returning *;
end;
$$;

revoke all on function public.accept_bank_match(uuid, uuid, uuid[], uuid, numeric, text[]) from public, anon, authenticated;
revoke all on function public.reject_bank_match(uuid, uuid, uuid, uuid, numeric, text[]) from public, anon, authenticated;
revoke all on function public.undo_match_decision(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_bank_match(uuid, uuid, uuid[], uuid, numeric, text[]) to service_role;
grant execute on function public.reject_bank_match(uuid, uuid, uuid, uuid, numeric, text[]) to service_role;
grant execute on function public.undo_match_decision(uuid, uuid, uuid) to service_role;
