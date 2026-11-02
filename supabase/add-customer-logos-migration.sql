-- Run in the Supabase SQL Editor after the existing tracker schema is installed.
-- Safe to re-run: this adds one nullable column, a private bucket, and scoped policies.
-- Existing customer rows and stored files are not changed or deleted.
begin;

alter table public.customers
  add column if not exists logo_path text;

alter table public.customers
  alter column logo_path drop not null,
  alter column logo_path drop default;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-logos',
  'customer-logos',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Customer owners and admins can read client logos" on storage.objects;
create policy "Customer owners and admins can read client logos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-logos'
    and exists (
      select 1
      from public.customers c
      where c.id::text = (storage.foldername(name))[2]
        and (
          (select public.is_admin())
          or (
            c.user_id = (select auth.uid())
            and (storage.foldername(name))[1] = (select auth.uid())::text
            and (select public.is_employee())
          )
        )
    )
  );

drop policy if exists "Employees can upload their customer logos" on storage.objects;
create policy "Employees can upload their customer logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-logos'
    and (select public.is_employee())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.customers c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Employees can update their customer logos" on storage.objects;
create policy "Employees can update their customer logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'customer-logos'
    and (select public.is_employee())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.customers c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'customer-logos'
    and (select public.is_employee())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.customers c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Employees can delete their customer logos" on storage.objects;
create policy "Employees can delete their customer logos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'customer-logos'
    and (select public.is_employee())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
