# Supabase setup

## Configure the app

Set the project URL and publishable/anon key in `.env`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_DEMO_MODE=false
```

The publishable key is intended for browser use. Never put a Supabase service-role key in a `VITE_*` variable or browser code. Keep `.env` local and ignored by Git.

## Apply database migrations

The original schema and seed are in:

- [Initial schema](./supabase/migrations/20261119000000_initial_schema.sql)
- [TUT seed](./supabase/seed.sql)
- [Backend and security migration](./supabase/migrations/20261119000001_application_backend.sql)
- [Profile RLS recursion fix](./supabase/migrations/20261119000002_fix_profile_rls_recursion.sql)

For a new project, link the Supabase CLI and apply migrations:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Run `supabase/seed.sql` in the Dashboard SQL Editor when creating a remote project. Local `db reset` runs it through the CLI seed configuration.

If migrations were already run manually in the Dashboard SQL Editor, do not run them a second time. Apply only the unapplied migrations in order. Before using `db push`, mark every migration already applied manually as applied in the CLI history; for example, if all three migrations above were applied manually:

```powershell
npx supabase migration repair --status applied 20261119000000
npx supabase migration repair --status applied 20261119000001
npx supabase migration repair --status applied 20261119000002
npx supabase db push
```

Never use `supabase db reset` against a hosted/production project; it resets the database.

## Create the first system administrator

1. Register a normal account in the app and confirm its email.
2. In the Supabase Dashboard SQL Editor, find that account by email and promote its profile. Replace the placeholder email:

```sql
update public.profiles
set role = 'SYSTEM_ADMIN', is_active = true
where id = (
  select id from auth.users
  where lower(email) = lower('admin@example.com')
);
```

The SQL editor operation is trusted administrative access. Do not expose SQL credentials or a service-role key to the client. Subsequent user and role management is restricted to the Edge Function below.

## Deploy privileged account management

The system-admin invite, role-change and account suspension flows use [the `manage-user` Edge Function](./supabase/functions/manage-user/index.ts). Deploy it and configure the app origin:

```powershell
npx supabase secrets set APP_ORIGIN=https://student-living.onrender.com
npx supabase functions deploy manage-user
```

`APP_ORIGIN` must be the deployed app's exact origin, with no trailing slash. This value is used for both Edge Function CORS and invitation redirects; using a localhost origin blocks requests from the deployed site.

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into `.env` or the frontend. The function verifies the caller is an active system administrator before invoking admin Auth operations.

## Auth, storage and data access

- Enable Email authentication and configure the Supabase site URL and redirect URLs for the deployed app.
- `property-media` is public for approved listing media. Upload paths are tied to the authenticated property owner.
- `verification-documents` is private. Document downloads use short-lived signed URLs and RLS checks.
- RLS scopes student, provider, university-admin and system-admin access. New applications and complaints are validated in the database; booking confirmation uses a transaction-safe RPC.
- Provider and property approval requires uploaded verification evidence.
- The browser checks that a property video is at least five minutes and persists the duration for a database-side minimum check. This duration metadata is client-reported; use a trusted media-processing service if independently verified duration is a production requirement.
- Test signup, confirmation, booking, uploads, review moderation and every role against a staging project before launch.

## Local development

With the Supabase CLI installed:

```powershell
npx supabase start
npx supabase db reset
npm run dev
```

`db reset` is for the local Supabase stack only.
