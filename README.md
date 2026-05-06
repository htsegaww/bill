# Lattice Bills

Lattice Bills is a modern bill-management app built with Next.js 16 and Supabase. It is designed as a production-ready foundation for shared households or small teams that need recurring bill tracking, spending visibility, and secure multi-user access.

## What is included

- A polished marketing page and dashboard experience built on the App Router.
- Supabase Auth magic-link sign-in with an auth callback route.
- Next 16 `proxy.ts` session refresh for SSR-safe authenticated routes.
- A relational Supabase schema with household membership and row-level security.
- Demo-mode fallback so the UI still runs before environment variables are configured.

## Local development

1. Install dependencies.

```bash
npm install
```

2. Copy the environment template and add your Supabase project keys.

```bash
cp .env.example .env.local
```

3. Run the SQL schema in your Supabase SQL editor.

```sql
-- paste supabase/schema.sql into the SQL editor
```

4. Start the development server.

```bash
npm run dev
```

Open http://localhost:3000 to view the landing page. Visit `/dashboard` to see the finance workspace and `/sign-in` to test authentication.

## Required environment variables

Add these to `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is included for future admin workflows, but the current scaffold only requires the public URL and anon key.

## Data model

The schema creates these main tables:

- `profiles`
- `households`
- `household_members`
- `bill_accounts`
- `bill_payments`
- `spending_transactions`

All dashboard data is scoped through `household_members`, and row-level security policies restrict read and write access to authenticated members of each household.

## Next steps

- Add form flows for creating bills, transactions, and household invites.
- Generate Supabase types from your live project for stricter typing.
- Add analytics, audit logs, and notification jobs for upcoming due dates.

## Validation

Run a production build before deployment:

```bash
npm run build
```
