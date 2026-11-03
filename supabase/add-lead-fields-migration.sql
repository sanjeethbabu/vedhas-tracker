-- Run in the Supabase SQL Editor after the existing tracker schema is installed.
-- Safe to re-run: this only adds/adjusts nullable columns and permissions.
-- Existing customer rows are not updated, deleted, or replaced.
begin;

alter table public.customers
  add column if not exists poc_designation text,
  add column if not exists email text,
  add column if not exists main_branch_location text,
  add column if not exists main_branch_contact text,
  add column if not exists main_branch_contact_same_as_primary boolean,
  add column if not exists preferred_fragrance text,
  add column if not exists interested_in text,
  add column if not exists priority_level text,
  add column if not exists lead_status text;

alter table public.customers
  alter column email drop not null,
  alter column email drop default,
  alter column main_branch_location drop not null,
  alter column main_branch_location drop default,
  alter column main_branch_contact drop not null,
  alter column main_branch_contact drop default,
  alter column main_branch_contact_same_as_primary drop not null,
  alter column main_branch_contact_same_as_primary drop default,
  alter column interested_in drop not null,
  alter column interested_in drop default,
  alter column priority_level drop not null,
  alter column priority_level drop default,
  alter column lead_status drop not null,
  alter column lead_status drop default;

alter table public.customers
  drop constraint if exists customers_lead_status_check;

update public.customers
set lead_status = case lead_status
  when 'new' then 'new_lead'
  when 'hot' then 'contacted'
  when 'warm' then 'contacted'
  when 'cold' then 'contacted'
  when 'converted' then 'closed'
  when 'lost' then 'closed'
  else lead_status
end
where lead_status in ('new', 'hot', 'warm', 'cold', 'converted', 'lost');

alter table public.customers
  add constraint customers_lead_status_check
    check (lead_status in ('new_lead', 'contacted', 'qualified', 'proposed', 'closed'));

alter table public.sales_options
  drop constraint if exists sales_options_option_type_check;
alter table public.sales_options
  add constraint sales_options_option_type_check
    check (option_type in ('beat_name', 'approached_for', 'interested_in'));

drop policy if exists "Admins can assign lead interest" on public.customers;
create policy "Admins can assign lead interest"
  on public.customers for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.protect_customer_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select public.is_employee()) and new.interested_in is not null then
      raise exception 'Lead interest can only be assigned by an administrator.';
    end if;
    return new;
  end if;

  if (select public.is_admin()) then
    if (to_jsonb(new) - 'interested_in' - 'updated_at')
      is distinct from (to_jsonb(old) - 'interested_in' - 'updated_at') then
      raise exception 'Administrators can only update lead interest.';
    end if;
  elsif (select public.is_employee())
    and new.interested_in is distinct from old.interested_in then
    raise exception 'Lead interest can only be assigned by an administrator.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_customer_admin_fields on public.customers;
create trigger protect_customer_admin_fields
  before insert or update on public.customers
  for each row execute function public.protect_customer_admin_fields();

commit;
