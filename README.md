# Vedhas Tracker

A mobile-first customer tracker for sales employees and read-only sales reporting for administrators.

## Sign-in and roles

- Employees sign in with an ID such as `emp001` and a password. They can create customer records and view, edit, export, or delete only records they submitted.
- Administrators sign in with an ID such as `admin001` and a password. They can view and export all employee submissions; admin reports are read-only.
- Role access comes from `public.profiles` and Supabase Row Level Security. The ID prefix is not itself an authorization check.
- The login page's **Create account** flow creates employee accounts only. Admin accounts must be provisioned by the project owner.
- Employee IDs must be approved in advance by an administrator; users cannot claim an arbitrary employee ID during sign-up.
- **Remember me** keeps the Supabase session in local storage. When unchecked, it uses session storage and is cleared when the browser tab/session ends.

## Supabase setup

1. Install Node.js 20.19+ or 22.12+.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the `profiles` and `customers` tables, admin-role helper, updated-at trigger, and row-level policies.
3. Create the first administrator:
   1. In **Authentication → Users**, add a confirmed user with email `admin001@accounts.vedhas.local` and a secure password.
   2. Copy that auth user's UUID.
   3. In SQL Editor, insert the corresponding profile, replacing the sample UUID and name:

      ```sql
      insert into public.profiles (user_id, employee_id, full_name, role)
      values ('AUTH-USER-UUID', 'admin001', 'Workspace Admin', 'admin');
      ```

   4. Sign in with `admin001` and the password created above. Do not expose the password in SQL or source code.
4. Approve employee IDs before employees use **Create account**. In SQL Editor, insert IDs your organization has assigned:

   ```sql
   insert into public.employee_invites (employee_id)
   values ('emp001'), ('emp002');
   ```

   The Edge Function consumes an approved ID when its account is created. It rejects unapproved IDs and only assigns the employee role.
5. Link the project and deploy the employee account function using the Supabase CLI:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy create-employee-account
   ```

   The function uses the project's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to create an auth user and employee profile. The service-role key must never be put in `.env`, frontend code, or any `VITE_` variable. The function accepts employee IDs only (`emp` plus at least three digits); it cannot create admins.
6. Copy `.env.example` to `.env` and provide the browser-safe project URL and publishable (or legacy anon) key from **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

6. Start the app:

   ```powershell
   npm install
   npm run dev
   ```

The local `.env` is ignored by Git. Restart Vite after changing it. For deployment, configure the same two public values in the hosting provider, then rebuild.

## ID-only authentication

Supabase password authentication still uses an internal synthetic email of the form `emp001@accounts.vedhas.local` or `admin001@accounts.vedhas.local`. The app derives it from the submitted ID and never asks the user for an email. Employees register through the deployed Edge Function after an admin has approved their ID in `employee_invites`; administrators are provisioned through Supabase Auth and the protected `profiles` table. Because these IDs are not email addresses, password recovery must be handled by an administrator resetting the user's password in Supabase Auth.

If you already have data from an earlier email-based deployment, do not create replacement accounts until you have planned how to map the old auth UUIDs and customer rows to the new employee IDs. Existing records stay associated with their original `user_id`.

## Data and CSV

CSV export downloads all records visible to the current user in the required 15-column order. It includes a UTF-8 BOM, correctly quotes/escapes fields, and neutralizes formula-leading text values for spreadsheet safety. For sector `Others`, the exported Sector value is the entered other-sector name. The database `brands` value is retained in the app but excluded from the exact 15-column export template.

## Build

```powershell
npm run build
```

## Hosted APK updates

The mobile menu's **Check for updates** action compares the installed web build with `/version.json`, which each Vite build generates automatically. The APK must load the hosted web app URL for **Update now** to fetch the current deployment; it reloads the hosted app and preserves the current route. It does not replace an APK with locally bundled assets or update the native Android package. For those distribution models, publish an APK through Google Play or configure a native OTA update service instead.

Configure the host/CDN to serve `version.json` and `index.html` with `Cache-Control: no-store` (or equivalent revalidation), while hashed files in `assets/` may be cached as immutable. Deploy the complete new `dist` output together so the version marker and assets refer to the same release.
