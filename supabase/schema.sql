-- Run this in the Supabase SQL Editor for your project.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  employee_id text not null check (
    employee_id = lower(employee_id)
    and employee_id ~ '^(emp|admin)[0-9]{3,}$'
  ),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  role text not null check (
    (role = 'employee' and employee_id ~ '^emp[0-9]{3,}$')
    or (role = 'admin' and employee_id ~ '^admin[0-9]{3,}$')
  ),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_employee_id_lower_idx
  on public.profiles (lower(employee_id));

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'employee'
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_employee() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_employee() to authenticated;

drop policy if exists "Users can read their own profile or admins can read all" on public.profiles;
create policy "Users can read their own profile or admins can read all"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

grant select on public.profiles to authenticated;

create table if not exists public.employee_invites (
  employee_id text primary key check (
    employee_id = lower(employee_id)
    and employee_id ~ '^emp[0-9]{3,}$'
  ),
  created_at timestamptz not null default now()
);

alter table public.employee_invites enable row level security;

drop policy if exists "Admins can manage employee invitations" on public.employee_invites;
create policy "Admins can manage employee invitations"
  on public.employee_invites for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update, delete on public.employee_invites to authenticated;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  serial_number bigint generated always as identity not null,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  customer_name text not null,
  sector text not null check (
    sector in (
      'Hotels & Residency',
      'Hospitals',
      'Schools',
      'Colleges',
      'Café & Restaurants',
      'IT Parks & Offices',
      'Showrooms',
      'Fun Parks',
      'Clubs',
      'Others'
    )
  ),
  other_sector text,
  poc_name text,
  contact_number text,
  beat_no text,
  area text,
  city text,
  location text,
  room_count text,
  strength text,
  branches text,
  brands text,
  required_litres_per_month numeric check (
    required_litres_per_month is null or required_litres_per_month >= 0
  ),
  current_purchase text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_other_sector_required check (
    sector <> 'Others' or nullif(trim(other_sector), '') is not null
  )
);

create index if not exists customers_user_id_serial_number_idx
  on public.customers (user_id, serial_number desc);
create index if not exists customers_user_id_city_idx
  on public.customers (user_id, city);
create index if not exists customers_user_id_sector_idx
  on public.customers (user_id, sector);

alter table public.customers enable row level security;

drop policy if exists "Users can view their own customers" on public.customers;
drop policy if exists "Employees see their own customers and admins see all" on public.customers;
create policy "Employees see their own customers and admins see all"
  on public.customers for select to authenticated
  using (
    (select public.is_admin())
    or ((select auth.uid()) = user_id and (select public.is_employee()))
  );

drop policy if exists "Users can add their own customers" on public.customers;
drop policy if exists "Employees can add their own customers" on public.customers;
create policy "Employees can add their own customers"
  on public.customers for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.is_employee())
  );

drop policy if exists "Users can update their own customers" on public.customers;
drop policy if exists "Employees can update their own customers" on public.customers;
create policy "Employees can update their own customers"
  on public.customers for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_employee()))
  with check ((select auth.uid()) = user_id and (select public.is_employee()));

drop policy if exists "Users can delete their own customers" on public.customers;
drop policy if exists "Employees can delete their own customers" on public.customers;
create policy "Employees can delete their own customers"
  on public.customers for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_employee()));

grant select, insert, update, delete on public.customers to authenticated;
grant usage, select on sequence public.customers_serial_number_seq to authenticated;

create or replace function public.set_customer_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.serial_number = old.serial_number;
  new.user_id = old.user_id;
  return new;
end;
$$;

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_customer_updated_at();
