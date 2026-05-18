# SalesMetrics UI

Next.js 16 app combining the SalesMetrics dashboard with the BillingSystem (bills, PCF, event forms) on a single Supabase project.

## Modules

| Section | Routes | Notes |
|---|---|---|
| Sales | `/`, `/sales`, `/daily-sales`, `/encoder`, `/inventory-movement` | Original salesmetrics-ui app. |
| Billing | `/bills`, `/bills/new`, `/bills/[id]`, `/bills/[id]/edit` | Bills CRUD with attachments, vendor relations, breakdown lines, PDF + xlsx export. |
| PCF | `/pcf`, `/pcf/new`, `/pcf/[id]`, `/pcf/[id]/edit` | Petty Cash Fund transactions with approve/reject/void/liquidate flows. |
| Event forms | `/event-forms`, `/forms/event-request`, `/forms/prospect-invitation`, `/forms/special-company-events` | Printable event request, prospect invitation, and special company events forms with print tracking. |
| Auth | `/login` | Supabase email/password; middleware redirects unauthenticated traffic. |

## Environment

Create `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<your salesmetrics Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your salesmetrics anon key>
SUPABASE_SERVICE_ROLE_KEY=<your salesmetrics service role key>

# Optional: while you don't have a Supabase Auth user yet
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

Create `.env.import` (only needed when running data-migration scripts — not at runtime):

```dotenv
SOURCE_SUPABASE_URL=<old BillingSystem Supabase URL>
SOURCE_SUPABASE_SERVICE_ROLE_KEY=<old BillingSystem service role key>
TARGET_SUPABASE_URL=<salesmetrics Supabase URL>
TARGET_SUPABASE_SERVICE_ROLE_KEY=<salesmetrics service role key>
```

## Dev

```bash
npm install
npm run dev
```

## Initial Supabase setup (one-time per environment)

Apply the billing schema to your salesmetrics Supabase project — pick one:

**Supabase CLI (re-runnable):**

```powershell
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Supabase Studio (manual):** open each file in `supabase/migrations/` in numerical order and paste it into Studio → SQL Editor → Run. Migrations are idempotent.

## Data migration from old BillingSystem (one-time)

After applying the SQL migrations and populating `.env.import`:

```powershell
# 1) Reconcile user_account first — review the diff before applying
npx tsx scripts/reconcile-user-accounts.ts                          # writes user-account-diff.json
npx tsx scripts/reconcile-user-accounts.ts --apply                  # imports Billing-only rows
npx tsx scripts/reconcile-user-accounts.ts --apply --resolve-conflicts  # also overwrites conflicts from Billing values

# 2) Copy all billing tables + storage bucket
npx tsx scripts/migrate-billing-data.ts                             # dry-run, prints counts
npx tsx scripts/migrate-billing-data.ts --apply                     # actually copy
```

Both scripts are idempotent (upsert by primary key, storage upload uses `upsert: true`). Re-running is safe.

## Auth

- Sign-in is email/password via Supabase Auth. The `/login` page calls `signInWithPassword`.
- Middleware (`src/middleware.ts`) redirects any unauthenticated request to `/login`, except `/login`, `/api/auth/*`, and static assets.
- Server components inside the `(app)` route group call `getSupabaseServerClient()` and `getUser()` for an additional check.
- For local development without a user yet, set `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` — middleware lets all traffic through and `AuthProvider` injects a stub `Dev User`.
- To create the first user, run from the project root: `npx tsx scripts/import-supabase-users.ts` (existing script) or invite via Supabase Studio → Auth.

## Project layout

```
src/
  app/
    (app)/              # auth-required route group
      page.tsx          # dashboard
      sales/            # sales metrics modules (original)
      daily-sales/
      encoder/
      inventory-movement/
      bills/            # billing module (ported)
      pcf/
      event-forms/
      forms/
      layout.tsx        # server-side auth check + AppTopbar + AuthProvider
    api/                # route handlers (service-role queries)
    login/              # /login (public)
    layout.tsx          # thin html/body shell
  components/
    ui/                 # shadcn base-nova primitives (input, label, sonner, separator)
    billing-ui/         # Radix-based shadcn components used by ported Billing pages (47 files)
    bills/, pcf/, forms/  # page + modal components for the ported modules
    layout/             # AppTopbar, UserMenu, navigation config
  lib/
    auth/               # AuthContext, authTypes, userDisplayName
    supabase/
      client.ts         # browser anon client
      server.ts         # service-role admin + SSR cookie clients
    alerts.ts, printElement.ts
  services/             # Supabase data-access layer (bills, pcf, vendors, etc.)
  types/                # shared TS types incl. billing.ts
  pdf/, print/, utils/, styles/  # PDF generation, printable templates, xlsx export

supabase/
  migrations/           # 5 SQL files (billing_core, pcf, forms, storage, rls)
  config.toml

scripts/
  migrate-billing-data.ts        # source -> target Supabase data copy
  reconcile-user-accounts.ts     # user_account merge between projects
  import-supabase-users.ts       # original salesmetrics user import (kept)
```

## Known follow-ups

- `src/components/ui/` (base-nova shadcn) and `src/components/billing-ui/` (Radix-based shadcn) currently coexist. Phase 4 of the merge plan will collapse them into one ecosystem.
- `generate_reference_no` and `get_next_reference_no` Postgres functions are recreated in migration 001 / 003 with format `BL-YYYYMM-####` and `{ER|SC|PI}-YYYYMM-####`. If your historical prefix scheme is different, edit those functions in Supabase Studio after applying — migrated rows keep their existing reference numbers regardless.
- `src/components/billing-ui/calendar.tsx` and `resizable.tsx` were dropped during the port due to upstream API drift; none of the ported pages use them. Re-add if needed.
