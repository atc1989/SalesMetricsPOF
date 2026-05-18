# Migrations

The `20260518000001_billing_core.sql` … `_005_rls.sql` set ports the BillingSystem
schema (vendors, bills, bill_breakdowns, bill_attachments, pcf_transactions,
event_requests, form_submissions, print_logs) plus storage bucket + RLS into the
salesmetrics Supabase project.

## How to apply

Pick **one**:

### A. Supabase CLI (preferred — re-runnable)

```powershell
# one-time link to your remote project
npx supabase login
npx supabase link --project-ref <your-project-ref>
# apply pending migrations
npx supabase db push
```

### B. Supabase Studio SQL Editor (manual paste, no CLI link)

Open each `.sql` file in numerical order and paste it into Studio → SQL Editor → Run.
They are idempotent (`if not exists` / `drop policy if exists`) so re-runs are safe.

## After applying — data migration

Set in `.env.import`:

```
SOURCE_SUPABASE_URL=<old BillingSystem URL>
SOURCE_SUPABASE_SERVICE_ROLE_KEY=<old BillingSystem service role key>
TARGET_SUPABASE_URL=<salesmetrics URL>
TARGET_SUPABASE_SERVICE_ROLE_KEY=<salesmetrics service role key>
```

Then:

```powershell
# 1. Reconcile user_account — review the diff file before applying
npx tsx scripts/reconcile-user-accounts.ts                # writes user-account-diff.json
npx tsx scripts/reconcile-user-accounts.ts --apply        # imports Billing-only rows

# 2. Copy all billing tables + storage objects
npx tsx scripts/migrate-billing-data.ts                   # dry-run, prints counts
npx tsx scripts/migrate-billing-data.ts --apply           # actually copy
```

## Notes

- `generate_reference_no` and `get_next_reference_no` are recreated from scratch with format
  `BL-YYYYMM-####` and `{ER|SC|PI}-YYYYMM-####` respectively. If your historical reference-number
  format differs (e.g., a different prefix), edit migration 001 and 003 before applying, OR
  let the migration go through and overwrite the function later. Existing reference numbers
  in migrated rows are preserved verbatim.
- The `user_account` table already exists in salesmetrics and is not recreated here — it is
  reconciled via the script in step 1 above.
