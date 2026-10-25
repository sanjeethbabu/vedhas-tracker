# Vedhas Tracker

A mobile-first customer tracker for sales employees and read-only sales reporting for administrators.

## Sign-in and roles

- Employees sign in with an ID such as `emp001` and a password. They can create customer records and view, edit, export, or delete only records they submitted.
- Administrators sign in with an ID such as `admin001` and a password. They can view and export all employee submissions; admin reports are read-only.
- Role access comes from `public.profiles` and Supabase Row Level Security. The ID prefix is not itself an authorization check.
- The login page's **Create account** flow creates employee accounts only. Admin accounts must be provisioned by the project owner.
- Employees can create their own accounts with a unique `emp` ID. Admin IDs and roles cannot be created through public sign-up.
- **Remember me** keeps the Supabase session in local storage. When unchecked, it uses session storage and is cleared when the browser tab/session ends.

## Supabase setup

1. Install Node.js 20.19+ or 22.12+.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). **This script first drops and recreates the app tables**, permanently deleting all customer records, employee profiles, and pending employee invitations. Supabase Auth users and passwords are not deleted, but their profiles must be reinserted before they can use the app. Do not rerun this reset on a live database unless you intend to erase that app data. The script creates the profiles/customers tables, role helpers, triggers, and row-level policies.
3. Create the first administrator:
   1. In **Authentication → Users**, add a confirmed user with email `admin001@accounts.vedhas.local` and a secure password.
   2. Copy that auth user's UUID.
   3. In SQL Editor, insert the corresponding profile, replacing the sample UUID and name:

      ```sql
      insert into public.profiles (user_id, employee_id, full_name, role)
      values ('AUTH-USER-UUID', 'admin001', 'Workspace Admin', 'admin');
      ```

   4. Sign in with `admin001` and the password created above. Do not expose the password in SQL or source code.
4. In Supabase **Authentication → Providers → Email**, turn off **Confirm email**. Accounts use an internal, non-deliverable address derived from the employee ID, so they cannot complete an email confirmation link.
5. For local development, copy `.env.example` to `.env` and provide the browser-safe project URL and publishable (or legacy anon) key from **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

6. Start the app:

   ```powershell
   npm install
   npm run dev
   ```

The local `.env` is ignored by Git. Restart Vite after changing it. For a deployment that does not use hosting environment variables, put the project URL and publishable/anon key in `public/supabase-config.js`. This file is served publicly, as are all Vite `VITE_` values, so only use the publishable/anon key—never a service-role key. The database must have the row-level security policies in `supabase/schema.sql` enabled. Commit the config file with the app and redeploy; local `.env` values take precedence when provided.

## ID-only authentication

Supabase password authentication still uses an internal synthetic email of the form `emp001@accounts.vedhas.local` or `admin001@accounts.vedhas.local`. The app derives it from the submitted ID and never asks the user for an email. Employee registration creates the Supabase Auth account and a database trigger creates its profile. Employee IDs must be unique, and the trigger always assigns the employee role; public sign-up cannot create admin profiles. Administrators are provisioned separately through Supabase Auth and the protected `profiles` table. Because these IDs are not email addresses, password recovery must be handled by an administrator resetting the user's password in Supabase Auth.

If you already have data from an earlier email-based deployment, do not create replacement accounts until you have planned how to map the old auth UUIDs and customer rows to the new employee IDs. Existing records stay associated with their original `user_id`.

## Reports and navigation

The app uses a single overview with the full customer/organisation list and an Add Customer button; there are no Quick Actions cards, sidebar, or CSV export. Admin reports can be filtered by a custom inclusive date range using the submission date.

## Build

```powershell
npm run build
```

## Hosted APK updates

The overview's **Check updates** action compares the installed web build with `/version.json`, which each Vite build generates automatically. The APK must load the hosted web app URL for **Update now** to fetch the current deployment; it reloads the hosted app and preserves the current route. It does not replace an APK with locally bundled assets or update the native Android package. For those distribution models, publish an APK through Google Play or configure a native OTA update service instead.

Configure the host/CDN to serve `version.json` and `index.html` with `Cache-Control: no-store` (or equivalent revalidation), while hashed files in `assets/` may be cached as immutable. Deploy the complete new `dist` output together so the version marker and assets refer to the same release.
