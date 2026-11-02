-- Run in the Supabase SQL Editor to upgrade an existing Royal Klense Tracker database.
-- Safe to re-run. Existing customer rows are preserved and legacy beat values are migrated.
begin;

alter table public.customers
  add column if not exists beat_name text,
  add column if not exists approached_for text,
  add column if not exists email text,
  add column if not exists main_branch_location text,
  add column if not exists main_branch_contact text,
  add column if not exists main_branch_contact_same_as_primary boolean not null default true,
  add column if not exists interested_in text,
  add column if not exists priority_level text not null default 'medium',
  add column if not exists lead_status text not null default 'new',
  add column if not exists count_type text not null default 'room'
    check (count_type in ('room', 'floor'));

alter table public.customers
  drop constraint if exists customers_main_branch_contact_consistency,
  drop constraint if exists customers_priority_level_check,
  drop constraint if exists customers_lead_status_check;

alter table public.customers
  add constraint customers_main_branch_contact_consistency check (
    (main_branch_contact_same_as_primary and main_branch_contact is null)
    or (
      not main_branch_contact_same_as_primary
      and nullif(trim(main_branch_contact), '') is not null
    )
  ),
  add constraint customers_priority_level_check check (
    priority_level in ('low', 'medium', 'high')
  ),
  add constraint customers_lead_status_check check (
    lead_status in ('new', 'hot', 'warm', 'cold', 'converted', 'lost')
  );

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'beat_no'
  ) then
    execute $migration$
      update public.customers
      set beat_name = coalesce(nullif(trim(beat_name), ''), nullif(trim(beat_no), ''))
      where nullif(trim(beat_no), '') is not null
    $migration$;
  end if;
end;
$$;

create table if not exists public.sales_options (
  id uuid primary key default gen_random_uuid(),
  option_type text not null,
  value text not null check (length(trim(value)) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint sales_options_option_type_check
    check (option_type in ('beat_name', 'approached_for', 'interested_in'))
);

alter table public.sales_options
  drop constraint if exists sales_options_option_type_check;
alter table public.sales_options
  add constraint sales_options_option_type_check
    check (option_type in ('beat_name', 'approached_for', 'interested_in'));

create unique index if not exists sales_options_type_value_lower_idx
  on public.sales_options (option_type, lower(trim(value)));

alter table public.sales_options enable row level security;

drop policy if exists "Authenticated users can read sales options" on public.sales_options;
create policy "Authenticated users can read sales options"
  on public.sales_options for select to authenticated
  using ((select public.is_admin()) or (select public.is_employee()));

drop policy if exists "Admins can add sales options" on public.sales_options;
create policy "Admins can add sales options"
  on public.sales_options for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update sales options" on public.sales_options;
create policy "Admins can update sales options"
  on public.sales_options for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete sales options" on public.sales_options;
create policy "Admins can delete sales options"
  on public.sales_options for delete to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.sales_options to authenticated;

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

insert into public.sales_options (option_type, value)
select 'beat_name', trim(beat_name)
from public.customers
where nullif(trim(beat_name), '') is not null
on conflict do nothing;

alter table public.customers drop column if exists beat_no;

commit;
