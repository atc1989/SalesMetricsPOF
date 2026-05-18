-- Align target schema with the actual source BillingSystem schema observed via
-- scripts/diff-schema.ts. The original migrations were inferred from service
-- code and missed several audit columns.

-- bills: add missing approval / payment / void / submission columns.
alter table public.bills
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists approval_notes text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid,
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid,
  add column if not exists payment_reference text,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid,
  add column if not exists void_reason text;

-- form_submissions: source has a created_by column we didn't include.
alter table public.form_submissions
  add column if not exists created_by uuid;

-- print_logs: source has printed_by.
alter table public.print_logs
  add column if not exists printed_by uuid;

-- event_requests is not a real table in the source project — the form data
-- lives in form_submissions with form_type = 'ER'. Drop the stub table we
-- mistakenly created in migration 003.
drop table if exists public.event_requests cascade;

-- Reset the user_account identity sequence past the max existing id so that
-- newly inserted Billing rows (which let Postgres assign a fresh id) don't
-- collide with rows that already live in salesmetrics.
do $$
declare
  v_seq text;
  v_max bigint;
begin
  v_seq := pg_get_serial_sequence('public.user_account', 'user_account_id');
  if v_seq is not null then
    select coalesce(max(user_account_id), 0) into v_max from public.user_account;
    perform setval(v_seq, v_max + 1, false);
  end if;
end$$;
