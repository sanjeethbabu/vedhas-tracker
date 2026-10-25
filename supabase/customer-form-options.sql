-- Run in the Supabase SQL Editor to upgrade an existing Royal Klense Tracker database.
-- Safe to re-run. Existing customer rows are preserved and legacy beat values are migrated.
begin;

alter table public.customers
  add column if not exists beat_name text,
  add column if not exists approached_for text,
  add column if not exists count_type text not null default 'room'
    check (count_type in ('room', 'floor'));

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
  option_type text not null check (option_type in ('beat_name', 'approached_for')),
  value text not null check (length(trim(value)) between 1 and 120),
  created_at timestamptz not null default now()
);

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

insert into public.sales_options (option_type, value)
select 'beat_name', trim(beat_name)
from public.customers
where nullif(trim(beat_name), '') is not null
on conflict do nothing;

alter table public.customers drop column if exists beat_no;

commit;
