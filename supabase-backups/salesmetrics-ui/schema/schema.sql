


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."request_type_enum" AS ENUM (
    'PIN RESET',
    'NAME CORRECTION'
);


ALTER TYPE "public"."request_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_next_inventory_movement_day"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  last_row public.inventory_movement_daily%rowtype;
  next_day date;
  next_bottle_out integer := 0;
  next_blister_out integer := 0;
begin
  select *
  into last_row
  from public.inventory_movement_daily
  order by movement_date desc
  limit 1;

  if last_row.movement_date is null then
    raise exception 'inventory_movement_daily has no seed row';
  end if;

  next_day := last_row.movement_date + 1;

  if next_day > current_date then
    return;
  end if;

  select
    coalesce(sum(released_count), 0)::integer,
    coalesce(sum(released_blpk_count), 0)::integer
  into
    next_bottle_out,
    next_blister_out
  from public.daily_sales
  where trans_date = next_day;

  insert into public.inventory_movement_daily (
    movement_date,
    bottle_opening,
    bottle_in,
    bottle_out,
    bottle_closing,
    blister_opening,
    blister_in,
    blister_out,
    blister_closing
  )
  values (
    next_day,
    last_row.bottle_closing,
    0,
    next_bottle_out,
    last_row.bottle_closing - next_bottle_out,
    last_row.blister_closing,
    0,
    next_blister_out,
    last_row.blister_closing - next_blister_out
  )
  on conflict (movement_date) do nothing;
end;
$$;


ALTER FUNCTION "public"."append_next_inventory_movement_day"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_inventory_movement_daily"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  truncate table public.inventory_movement_daily;

  insert into public.inventory_movement_daily (
    movement_date,
    bottle_opening,
    bottle_in,
    bottle_out,
    bottle_closing,
    blister_opening,
    blister_in,
    blister_out,
    blister_closing
  )
  with settings as (
    select
      date '2025-02-01' as range_start,
      current_date as range_end,
      date '2025-02-22' as deduction_start,
      24139::integer as initial_bottle_stock,
      20051::integer as initial_blister_stock
  ),
  all_dates as (
    select generate_series(
      (select range_start from settings),
      (select range_end from settings),
      interval '1 day'
    )::date as movement_date
  ),
  daily_out as (
    select
      trans_date::date as movement_date,
      coalesce(sum(released_count), 0)::integer as bottle_out,
      coalesce(sum(released_blpk_count), 0)::integer as blister_out
    from public.daily_sales
    where trans_date between
      (select deduction_start from settings)
      and
      (select range_end from settings)
    group by trans_date::date
  ),
  daily_in as (
    select
      movement_date,
      coalesce(sum(bottle_in), 0)::integer as bottle_in,
      coalesce(sum(blister_in), 0)::integer as blister_in
    from public.inventory_stock_movements
    group by movement_date
  ),
  base as (
    select
      d.movement_date,
      coalesce(i.bottle_in, 0) as bottle_in,
      case
        when d.movement_date >= (select deduction_start from settings)
          then coalesce(o.bottle_out, 0)
        else 0
      end as bottle_out,
      coalesce(i.blister_in, 0) as blister_in,
      case
        when d.movement_date >= (select deduction_start from settings)
          then coalesce(o.blister_out, 0)
        else 0
      end as blister_out
    from all_dates d
    left join daily_out o
      on o.movement_date = d.movement_date
    left join daily_in i
      on i.movement_date = d.movement_date
  ),
  computed as (
    select
      b.movement_date,
      (
        (select initial_bottle_stock from settings)
        + coalesce(
            sum(b.bottle_in - b.bottle_out) over (
              order by b.movement_date
              rows between unbounded preceding and 1 preceding
            ),
            0
          )
      )::integer as bottle_opening,
      b.bottle_in,
      b.bottle_out,
      (
        (select initial_bottle_stock from settings)
        + coalesce(
            sum(b.bottle_in - b.bottle_out) over (
              order by b.movement_date
              rows between unbounded preceding and current row
            ),
            0
          )
      )::integer as bottle_closing,
      (
        (select initial_blister_stock from settings)
        + coalesce(
            sum(b.blister_in - b.blister_out) over (
              order by b.movement_date
              rows between unbounded preceding and 1 preceding
            ),
            0
          )
      )::integer as blister_opening,
      b.blister_in,
      b.blister_out,
      (
        (select initial_blister_stock from settings)
        + coalesce(
            sum(b.blister_in - b.blister_out) over (
              order by b.movement_date
              rows between unbounded preceding and current row
            ),
            0
          )
      )::integer as blister_closing
    from base b
  )
  select
    movement_date,
    bottle_opening,
    bottle_in,
    bottle_out,
    bottle_closing,
    blister_opening,
    blister_in,
    blister_out,
    blister_closing
  from computed
  order by movement_date;
end;
$$;


ALTER FUNCTION "public"."rebuild_inventory_movement_daily"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."daily_sales" (
    "daily_sales_id" bigint NOT NULL,
    "event_name" "text",
    "trans_date" "date",
    "gg_trans_no" "text",
    "pof_number" "text",
    "member_name" "text",
    "username" "text",
    "is_new_member" boolean DEFAULT false,
    "member_type" "text",
    "package_type" "text",
    "original_price" numeric(12,2),
    "quantity" integer,
    "is_to_blister" boolean DEFAULT false,
    "blister_count" integer,
    "discount" numeric(12,2),
    "price_after_discount" numeric(12,2),
    "one_time_discount" numeric(12,2),
    "bottle_count" integer,
    "released_count" integer DEFAULT 1,
    "released_blpk_count" integer DEFAULT 0,
    "to_follow_count" integer DEFAULT 0,
    "to_follow_blpk_count" integer DEFAULT 0,
    "sales" numeric(12,2),
    "mode_of_payment" "text",
    "payment_type" "text",
    "reference_number" "text",
    "sales_two" numeric(12,2) DEFAULT 0,
    "mode_of_payment_two" "text",
    "payment_type_two" "text" DEFAULT 'N/A'::"text",
    "reference_number_two" "text",
    "sales_three" numeric(12,2) DEFAULT 0,
    "mode_of_payment_three" "text" DEFAULT 'N/A'::"text",
    "payment_type_three" "text",
    "reference_number_three" "text",
    "remarks" "text",
    "received_by" "text",
    "collected_by" "text",
    "fullfilment_date" "date",
    "bag_type" "text",
    "bag_quantity" integer DEFAULT 0 NOT NULL,
    "marketing_tool" "text",
    "marketing_quantity" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "daily_sales_bag_quantity_check" CHECK (("bag_quantity" >= 0)),
    CONSTRAINT "daily_sales_marketing_quantity_check" CHECK (("marketing_quantity" >= 0))
);


ALTER TABLE "public"."daily_sales" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_daily_sales"("p" "jsonb") RETURNS "public"."daily_sales"
    LANGUAGE "plpgsql"
    AS $$
declare
  r public.daily_sales;
begin
  insert into public.daily_sales
  (
    event_name,
    trans_date,
    pof_number,
    member_name,
    username,
    is_new_member,
    member_type,
    package_type,
    is_to_blister,
    original_price,
    quantity,
    blister_count,
    discount,
    price_after_discount,
    one_time_discount,
    bottle_count,
    sales,
    released_count,
    released_blpk_count,
    to_follow_count,
    to_follow_blpk_count,
    mode_of_payment,
    payment_type,
    reference_number,
    sales_two,
    mode_of_payment_two,
    payment_type_two,
    reference_number_two,
    sales_three,
    mode_of_payment_three,
    payment_type_three,
    reference_number_three,
    remarks,
    received_by,
    collected_by
  )
  values
  (
    nullif(trim(p->>'event_name'), ''),
    (p->>'trans_date')::date,
    nullif(trim(p->>'pof_number'), ''),
    nullif(trim(p->>'member_name'), ''),
    nullif(trim(p->>'username'), ''),
    public.rpc_to_bool(p->>'is_new_member'),
    nullif(trim(p->>'member_type'), ''),
    nullif(trim(p->>'package_type'), ''),
    public.rpc_to_bool(p->>'is_to_blister'),
    nullif(p->>'original_price','')::numeric,
    nullif(p->>'quantity','')::int,
    coalesce(nullif(p->>'blister_count','')::int, 0),
    nullif(p->>'discount','')::numeric,
    nullif(p->>'price_after_discount','')::numeric,
    nullif(p->>'one_time_discount','')::numeric,
    nullif(p->>'bottle_count','')::int,
    nullif(p->>'sales','')::numeric,
    coalesce(nullif(p->>'released_count','')::int, 0),
    coalesce(nullif(p->>'released_blpk_count','')::int, 0),
    coalesce(nullif(p->>'to_follow_count','')::int, 0),
    coalesce(nullif(p->>'to_follow_blpk_count','')::int, 0),
    nullif(trim(p->>'mode_of_payment'), ''),
    nullif(trim(p->>'payment_type'), ''),
    nullif(trim(p->>'reference_number'), ''),
    coalesce(nullif(p->>'sales_two','')::numeric, 0),
    coalesce(nullif(trim(p->>'mode_of_payment_two'), ''), 'N/A'),
    coalesce(nullif(trim(p->>'payment_type_two'), ''), 'N/A'),
    nullif(trim(p->>'reference_number_two'), ''),
    coalesce(nullif(p->>'sales_three','')::numeric, 0),
    coalesce(nullif(trim(p->>'mode_of_payment_three'), ''), 'N/A'),
    coalesce(nullif(trim(p->>'payment_type_three'), ''), 'N/A'),
    nullif(trim(p->>'reference_number_three'), ''),
    nullif(trim(p->>'remarks'), ''),
    nullif(trim(p->>'received_by'), ''),
    nullif(trim(p->>'collected_by'), '')
  )
  returning * into r;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_add_daily_sales"("p" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "expense_id" bigint NOT NULL,
    "zero_one" "text",
    "expense_name" "text",
    "amount" numeric(12,2),
    "remarks" "text",
    "expense_date" "date",
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_expenses"("i_zero_one" "text", "i_expense_name" "text", "i_amount" numeric, "i_remarks" "text", "i_expense_date" "date") RETURNS "public"."expenses"
    LANGUAGE "plpgsql"
    AS $$
declare
  r public.expenses;
begin
  insert into public.expenses
  (
    zero_one,
    expense_name,
    amount,
    remarks,
    expense_date,
    date_created,
    date_updated
  )
  values
  (
    i_zero_one,
    i_expense_name,
    i_amount,
    i_remarks,
    i_expense_date,
    now(),
    now()
  )
  on conflict (zero_one, expense_name, amount, expense_date)
  do update set
    remarks = excluded.remarks,
    date_updated = now()
  returning * into r;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_add_expenses"("i_zero_one" "text", "i_expense_name" "text", "i_amount" numeric, "i_remarks" "text", "i_expense_date" "date") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_forms" (
    "request_id" bigint NOT NULL,
    "control_no" "text",
    "request_type" "public"."request_type_enum" DEFAULT 'NAME CORRECTION'::"public"."request_type_enum",
    "username" "text",
    "contact_no" "text",
    "change_into" "text",
    "remarks" "text",
    "date_created" timestamp with time zone
);


ALTER TABLE "public"."request_forms" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_add_request_form"("p_control_no" "text", "p_request_type" "text", "p_username" "text", "p_contact_no" "text", "p_change_into" "text", "p_remarks" "text") RETURNS "public"."request_forms"
    LANGUAGE "plpgsql"
    AS $$
declare
  r public.request_forms;
begin
  insert into public.request_forms (
    control_no,
    request_type,
    username,
    contact_no,
    change_into,
    remarks,
    date_created
  )
  values (
    nullif(trim(p_control_no), ''),
    (trim(p_request_type))::public.request_type_enum,
    nullif(trim(p_username), ''),
    nullif(trim(p_contact_no), ''),
    nullif(trim(p_change_into), ''),
    nullif(trim(p_remarks), ''),
    now()
  )
  returning * into r;

  return r;
exception
  when invalid_text_representation then
    raise exception 'Invalid request_type: %. Allowed: %',
      p_request_type,
      array(select unnest(enum_range(null::public.request_type_enum)));
end;
$$;


ALTER FUNCTION "public"."rpc_add_request_form"("p_control_no" "text", "p_request_type" "text", "p_username" "text", "p_contact_no" "text", "p_change_into" "text", "p_remarks" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_cash_on_hand_total"("p_trans_date" "date") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select
    (
      coalesce(pcs_one_thousand,0) * 1000 +
      coalesce(pcs_five_hundred,0) * 500 +
      coalesce(pcs_two_hundred,0) * 200 +
      coalesce(pcs_one_hundred,0) * 100 +
      coalesce(pcs_fifty,0) * 50 +
      coalesce(pcs_twenty,0) * 20 +
      coalesce(pcs_ten,0) * 10 +
      coalesce(pcs_five,0) * 5 +
      coalesce(pcs_one,0) * 1 +
      coalesce(pcs_cents,0) * 0.01
    )::numeric
  from public.cash_on_hand
  where trans_date = p_trans_date
  limit 1;
$$;


ALTER FUNCTION "public"."rpc_cash_on_hand_total"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_compact_name"("v" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select regexp_replace(coalesce(trim(v), ''), '\s+', '', 'g');
$$;


ALTER FUNCTION "public"."rpc_compact_name"("v" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_inventory"("p_date_from" "date", "p_date_to" "date") RETURNS TABLE("trans_date" "date", "event_name" "text", "total_transactions" bigint, "total_sales" numeric, "total_qty" bigint, "total_bottle_count" bigint, "total_blister_count" bigint, "released_count" bigint, "released_blpk_count" bigint, "to_follow_count" bigint, "to_follow_blpk_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    ds.trans_date,
    max(ds.event_name) as event_name,
    count(distinct ds.pof_number) as total_transactions,
    sum(coalesce(ds.sales,0) + coalesce(ds.sales_two,0) + coalesce(ds.sales_three,0))::numeric as total_sales,
    sum(coalesce(ds.quantity,0))::bigint as total_qty,
    sum(coalesce(ds.bottle_count,0))::bigint as total_bottle_count,
    sum(coalesce(ds.blister_count,0))::bigint as total_blister_count,
    sum(coalesce(ds.released_count,0))::bigint as released_count,
    sum(coalesce(ds.released_blpk_count,0))::bigint as released_blpk_count,
    sum(coalesce(ds.to_follow_count,0))::bigint as to_follow_count,
    sum(coalesce(ds.to_follow_blpk_count,0))::bigint as to_follow_blpk_count
  from public.daily_sales ds
  where ds.trans_date between p_date_from and p_date_to
  group by ds.trans_date
  order by ds.trans_date desc;
$$;


ALTER FUNCTION "public"."rpc_daily_inventory"("p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_arcsa"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('ARCSA','AR_CSA')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_arcsa"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_arleadersupport"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('ARLEADERSUPPORT','AR_LEADER_SUPPORT')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_arleadersupport"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_bank"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.payment_type,
    p.reference_number,
    sum(p.amount)::numeric as amount,
    p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) = 'BANK'
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_bank"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_cheque"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.payment_type,
    p.reference_number,
    sum(p.amount)::numeric as amount,
    p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.payment_type,'')) = 'CHEQUE'
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_cheque"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_credit_card"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.payment_type,
    p.reference_number,
    sum(p.amount)::numeric as amount,
    p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.payment_type,'')) = 'CREDITCARD'
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_credit_card"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_epoints"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.payment_type,
    p.reference_number,
    sum(p.amount)::numeric as amount,
    p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.payment_type,'')) = 'EPOINTS'
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_epoints"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_ewallet"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.payment_type,
    p.reference_number,
    sum(p.amount)::numeric as amount,
    p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) = 'EWALLET'
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_ewallet"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_mayaatc"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('MAYAATC','MAYA_ATC')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_mayaatc"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_mayaigi"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('MAYAIGI','MAYA_IGI')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_mayaigi"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_sbcollectatc"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('SBCOLLECTATC','SB_COLLECT_ATC')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_sbcollectatc"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_daily_sales_sbcollectigi"("p_trans_date" "date") RETURNS TABLE("payment_type" "text", "reference_number" "text", "amount" numeric, "pof_number" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select p.payment_type, p.reference_number, sum(p.amount)::numeric as amount, p.pof_number
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
    and upper(coalesce(p.mode_of_payment,'')) in ('SBCOLLECTIGI','SB_COLLECT_IGI')
  group by p.payment_type, p.reference_number, p.pof_number
  order by amount desc;
$$;


ALTER FUNCTION "public"."rpc_daily_sales_sbcollectigi"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_cash_on_hand"("p_trans_date" "date") RETURNS TABLE("trans_date" "date", "pcs_one_thousand" integer, "pcs_five_hundred" integer, "pcs_two_hundred" integer, "pcs_one_hundred" integer, "pcs_fifty" integer, "pcs_twenty" integer, "pcs_ten" integer, "pcs_five" integer, "pcs_one" integer, "pcs_cents" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select
    coh.trans_date,
    coh.pcs_one_thousand,
    coh.pcs_five_hundred,
    coh.pcs_two_hundred,
    coh.pcs_one_hundred,
    coh.pcs_fifty,
    coh.pcs_twenty,
    coh.pcs_ten,
    coh.pcs_five,
    coh.pcs_one,
    coh.pcs_cents
  from public.cash_on_hand coh
  where coh.trans_date = p_trans_date
  limit 1;
$$;


ALTER FUNCTION "public"."rpc_get_cash_on_hand"("p_trans_date" "date") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."codes" (
    "code_id" bigint NOT NULL,
    "username" "text",
    "full_name" "text",
    "code_value" "text",
    "code_pin" "text",
    "code_sku" "text",
    "code_payment" "text" DEFAULT ''::"text",
    "code_amount" numeric(12,2),
    "code_status" "text" DEFAULT 'UNUSED'::"text",
    "code_date_created" timestamp with time zone,
    "code_date_used" timestamp with time zone
);


ALTER TABLE "public"."codes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_codes_by_code_value"("p_code_value" "text") RETURNS SETOF "public"."codes"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.codes
  where code_value = trim(p_code_value)
  order by code_date_created desc nulls last, code_id desc;
$$;


ALTER FUNCTION "public"."rpc_get_codes_by_code_value"("p_code_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_codes_by_username"("p_username" "text") RETURNS SETOF "public"."codes"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.codes
  where username = trim(p_username)
  order by code_date_created desc nulls last, code_id desc;
$$;


ALTER FUNCTION "public"."rpc_get_codes_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_expenses"("i_expense_id" bigint DEFAULT 0) RETURNS SETOF "public"."expenses"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.expenses
  where (i_expense_id = 0) or (expense_id = i_expense_id)
  order by expense_id desc;
$$;


ALTER FUNCTION "public"."rpc_get_expenses"("i_expense_id" bigint) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gg_codes" (
    "id" bigint NOT NULL,
    "owner_user_name" "text",
    "owner_name" "text",
    "code_status" "text",
    "used_by_user_name" "text",
    "used_by_name" "text",
    "code_sku" "text",
    "code_payment" "text",
    "code" "text",
    "code_amount" numeric(12,2),
    "code_pin" "text",
    "code_date_created" "text"
);


ALTER TABLE "public"."gg_codes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_gg_codes_by_owner"("p_owner_user_name" "text") RETURNS SETOF "public"."gg_codes"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.gg_codes
  where owner_user_name = trim(p_owner_user_name)
  order by id desc;
$$;


ALTER FUNCTION "public"."rpc_get_gg_codes_by_owner"("p_owner_user_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_gg_codes_by_used_by"("p_used_by_user_name" "text") RETURNS SETOF "public"."gg_codes"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.gg_codes
  where used_by_user_name = trim(p_used_by_user_name)
  order by id desc;
$$;


ALTER FUNCTION "public"."rpc_get_gg_codes_by_used_by"("p_used_by_user_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_request_forms"("p_request_id" bigint DEFAULT 0, "p_username" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."request_forms"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.request_forms
  where
    (p_request_id = 0 or request_id = p_request_id)
    and (p_username is null or username = p_username)
  order by date_created desc, request_id desc;
$$;


ALTER FUNCTION "public"."rpc_get_request_forms"("p_request_id" bigint, "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_target_ratio"() RETURNS TABLE("target_ratio" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  select tr.target_ratio
  from public.target_ratio tr
  limit 1;
$$;


ALTER FUNCTION "public"."rpc_get_target_ratio"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_account" (
    "user_account_id" bigint NOT NULL,
    "user_name" "text",
    "full_name" "text",
    "sponsor" "text",
    "placement" "text",
    "group" "text",
    "account_type" "text",
    "zero_one" "text",
    "code_payment" "text",
    "is_leader" boolean DEFAULT false,
    "is_new_member" boolean DEFAULT true,
    "brgy" "text",
    "city" "text",
    "province" "text",
    "region" "text",
    "country" "text",
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."user_account" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_get_user_acc_no_zero_one"("i_user_account_id" bigint DEFAULT 0) RETURNS SETOF "public"."user_account"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.user_account
  where
    (i_user_account_id = 0 or user_account_id = i_user_account_id)
    and (zero_one is null or trim(zero_one) = '')
  order by user_account_id desc;
$$;


ALTER FUNCTION "public"."rpc_get_user_acc_no_zero_one"("i_user_account_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_modify_daily_sales"("p" "jsonb") RETURNS "public"."daily_sales"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id bigint;
  r public.daily_sales;
begin
  v_id := (p->>'daily_sales_id')::bigint;

  update public.daily_sales
  set
    event_name = nullif(trim(p->>'event_name'), ''),
    trans_date = (p->>'trans_date')::date,
    pof_number = nullif(trim(p->>'pof_number'), ''),
    member_name = nullif(trim(p->>'member_name'), ''),
    username = nullif(trim(p->>'username'), ''),
    is_new_member = public.rpc_to_bool(p->>'is_new_member'),
    member_type = nullif(trim(p->>'member_type'), ''),
    package_type = nullif(trim(p->>'package_type'), ''),
    original_price = nullif(p->>'original_price','')::numeric,
    quantity = nullif(p->>'quantity','')::int,
    discount = nullif(p->>'discount','')::numeric,
    price_after_discount = nullif(p->>'price_after_discount','')::numeric,
    one_time_discount = nullif(p->>'one_time_discount','')::numeric,
    bottle_count = nullif(p->>'bottle_count','')::int,
    sales = nullif(p->>'sales','')::numeric,
    released_count = coalesce(nullif(p->>'released_count','')::int, released_count),
    released_blpk_count = coalesce(nullif(p->>'released_blpk_count','')::int, released_blpk_count),
    to_follow_count = coalesce(nullif(p->>'to_follow_count','')::int, to_follow_count),
    to_follow_blpk_count = coalesce(nullif(p->>'to_follow_blpk_count','')::int, to_follow_blpk_count),
    mode_of_payment = nullif(trim(p->>'mode_of_payment'), ''),
    payment_type = nullif(trim(p->>'payment_type'), ''),
    reference_number = nullif(trim(p->>'reference_number'), ''),
    remarks = nullif(trim(p->>'remarks'), ''),
    received_by = nullif(trim(p->>'received_by'), ''),
    collected_by = nullif(trim(p->>'collected_by'), '')
  where daily_sales_id = v_id;

  select * into r
  from public.daily_sales
  where daily_sales_id = v_id;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_modify_daily_sales"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_gg_trans_no" bigint) RETURNS "public"."daily_sales"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  r public.daily_sales;
begin
  update public.daily_sales
  set gg_trans_no = p_gg_trans_no
  where daily_sales_id = p_daily_sales_id;

  select * into r
  from public.daily_sales
  where daily_sales_id = p_daily_sales_id;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_gg_trans_no" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_username" "text") RETURNS "public"."daily_sales"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  r public.daily_sales;
begin
  update public.daily_sales
  set username = nullif(trim(p_username), '')
  where daily_sales_id = p_daily_sales_id;

  select * into r
  from public.daily_sales
  where daily_sales_id = p_daily_sales_id;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_modify_user_zero_one"("p_user_name" "text", "p_zero_one" "text", "p_code_payment" "text") RETURNS "public"."user_account"
    LANGUAGE "plpgsql"
    AS $$
declare
  r public.user_account;
begin
  update public.user_account
  set
    zero_one = nullif(trim(p_zero_one), ''),
    code_payment = nullif(trim(p_code_payment), ''),
    date_updated = now()
  where user_name = trim(p_user_name);

  if not found then
    raise exception 'User not found for user_name=%', p_user_name;
  end if;

  select * into r
  from public.user_account
  where user_name = trim(p_user_name)
  limit 1;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_modify_user_zero_one"("p_user_name" "text", "p_zero_one" "text", "p_code_payment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_modify_user_zero_one_by_full_name"("p_full_name" "text", "p_zero_one" "text", "p_code_payment" "text") RETURNS "public"."user_account"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count int;
  v_user_name text;
  r public.user_account;
begin
  select count(*)
  into v_count
  from public.user_account
  where full_name = trim(p_full_name);

  if v_count = 0 then
    raise exception 'No user_account found for full_name=%', p_full_name;
  end if;

  if v_count > 1 then
    raise exception 'Multiple user_account rows found for full_name=% (ambiguous). Use rpc_modify_user_zero_one(user_name,...) instead.', p_full_name;
  end if;

  select user_name
  into v_user_name
  from public.user_account
  where full_name = trim(p_full_name)
  limit 1;

  update public.user_account
  set
    zero_one = nullif(trim(p_zero_one), ''),
    code_payment = nullif(trim(p_code_payment), ''),
    date_updated = now()
  where user_name = v_user_name;

  select * into r
  from public.user_account
  where user_name = v_user_name
  limit 1;

  return r;
end;
$$;


ALTER FUNCTION "public"."rpc_modify_user_zero_one_by_full_name"("p_full_name" "text", "p_zero_one" "text", "p_code_payment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_norm_status"("v" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when v is null or trim(v) = '' then 'UNUSED'
    else upper(trim(v))
  end;
$$;


ALTER FUNCTION "public"."rpc_norm_status"("v" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_package_retail"("p_trans_date" "date") RETURNS TABLE("package_type" "text", "total_qty" bigint, "total_sales" numeric, "total_bottle_count" bigint, "total_blister_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    ds.package_type,
    sum(coalesce(ds.quantity,0))::bigint as total_qty,
    sum(coalesce(ds.sales,0) + coalesce(ds.sales_two,0) + coalesce(ds.sales_three,0))::numeric as total_sales,
    sum(coalesce(ds.bottle_count,0))::bigint as total_bottle_count,
    sum(coalesce(ds.blister_count,0))::bigint as total_blister_count
  from public.daily_sales ds
  where ds.trans_date = p_trans_date
  group by ds.package_type
  order by total_sales desc;
$$;


ALTER FUNCTION "public"."rpc_package_retail"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_payment_breakdown"("p_trans_date" "date") RETURNS TABLE("mode_of_payment" "text", "payment_type" "text", "total_amount" numeric, "total_transactions" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    coalesce(p.mode_of_payment,'') as mode_of_payment,
    coalesce(p.payment_type,'') as payment_type,
    sum(coalesce(p.amount,0))::numeric as total_amount,
    count(distinct p.pof_number)::bigint as total_transactions
  from public.vw_daily_sales_payments_norm p
  where p.trans_date = p_trans_date
  group by coalesce(p.mode_of_payment,''), coalesce(p.payment_type,'')
  order by total_amount desc;
$$;


ALTER FUNCTION "public"."rpc_payment_breakdown"("p_trans_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_remove_pof"("i_pof_number" "text") RETURNS TABLE("ret_msg" "text", "ret_status" integer)
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from public.daily_sales
  where pof_number = i_pof_number;

  return query
  select
    'Package order was removed successfully. Thank you.'::text,
    1::int;
end;
$$;


ALTER FUNCTION "public"."rpc_remove_pof"("i_pof_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sales_api_performance"("p_date_from" "date", "p_date_to" "date") RETURNS TABLE("leader_name" "text", "avatar" "text", "sales" numeric, "expenses" numeric, "target_ratio" numeric, "actual_ratio" numeric, "perf_perc" numeric, "bottle_count" numeric, "new_members" numeric, "active_count" numeric, "inactive_count" numeric, "member_count" numeric, "rank_number" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  with date_window as (
    select p_date_from::date as d_from, p_date_to::date as d_to
  ),

  ua_distinct as (
    select distinct
      full_name,
      zero_one,
      is_new_member,
      is_leader,
      user_name
    from public.user_account
    where zero_one is not null
  ),

  -- SALES side (from sales_api)
  sales_rows as (
    select
      coalesce(ua.zero_one, sa.user_name) as leader_name,
      sa.code_sku,
      case
        when sa.code_sku in ('PLATINUM','FSPLATINUM') then 10 * coalesce(sa.qty,0)
        when sa.code_sku in ('GOLD','FSGOLD') then 3 * coalesce(sa.qty,0)
        else 1 * coalesce(sa.qty,0)
      end as bottle_count,
      case
        when upper(ua.zero_one) = 'HEADEAGLE01' then 'https://i.ibb.co/pjDZ5BF8/Avatar-Maker-2.png'
        when upper(ua.zero_one) = 'HERA01' then 'https://i.ibb.co/WpjXNPG7/Avatar-Maker.png'
        when upper(ua.zero_one) = 'IRONMAN' then 'https://i.ibb.co/ZRS9MBQL/Avatar-Maker-3.png'
        else 'https://i.ibb.co/J4C0bCk/Avatar-Maker-4.png'
      end as avatar,
      sa.amount as sales,
      sa.transdate::timestamptz as transdate
    from public.sales_api sa
    left join ua_distinct ua
      on regexp_replace(trim(ua.full_name), '\s+', '', 'g')
       = regexp_replace(trim(sa."user"), '\s+', '', 'g')
    join date_window w on true
    where
      ua.zero_one is not null
      and sa.transdate::date between w.d_from and w.d_to
  ),

  sales_by_day as (
    select
      leader_name,
      max(avatar) as avatar,
      transdate::date as dt,
      sum(coalesce(sales,0)) as sales,
      sum(coalesce(bottle_count,0)) as bottle_count
    from sales_rows
    group by leader_name, transdate::date
  ),

  -- EXPENSE side
  expense_rows as (
    select
      upper(ua.zero_one) as leader_name,
      case
        when upper(ua.zero_one) = 'HEADEAGLE01' then 'https://i.ibb.co/pjDZ5BF8/Avatar-Maker-2.png'
        when upper(ua.zero_one) = 'HERA01' then 'https://i.ibb.co/WpjXNPG7/Avatar-Maker.png'
        when upper(ua.zero_one) = 'IRONMAN' then 'https://i.ibb.co/ZRS9MBQL/Avatar-Maker-3.png'
        else 'https://i.ibb.co/J4C0bCk/Avatar-Maker-4.png'
      end as avatar,
      coalesce(e.amount,0) as expense,
      coalesce(public.try_ts(e.expense_date::text), (now() at time zone 'Asia/Manila'))::date as dt
    from public.expenses e
    left join ua_distinct ua on upper(ua.zero_one) = upper(e.zero_one)
    join date_window w on true
    where
      ua.zero_one is not null
      and coalesce(public.try_ts(e.expense_date::text), (now() at time zone 'Asia/Manila'))::date
          between w.d_from and w.d_to
  ),

  expense_by_day as (
    select
      leader_name,
      max(avatar) as avatar,
      dt,
      sum(expense) as expenses
    from expense_rows
    group by leader_name, dt
  ),

  -- FULL OUTER join sales + expenses per day
  day_union as (
    select
      coalesce(s.leader_name, e.leader_name) as leader_name,
      coalesce(s.avatar, e.avatar) as avatar,
      coalesce(s.dt, e.dt) as dt,
      coalesce(s.sales,0) as sales,
      coalesce(e.expenses,0) as expenses,
      coalesce(s.bottle_count,0) as bottle_count
    from sales_by_day s
    full join expense_by_day e
      on upper(e.leader_name) = upper(s.leader_name)
     and e.dt = s.dt
  ),

  -- Leader filter: use user_account.is_leader=true
  base_filtered as (
    select du.*
    from day_union du
    join public.user_account ua
      on upper(ua.zero_one) = upper(du.leader_name)
    where coalesce(ua.is_leader,false) = true
  ),

  totals as (
    select
      leader_name,
      max(avatar) as avatar,
      sum(sales) as sales,
      sum(expenses) as expenses,
      sum(bottle_count) as bottle_count,
      (select tr.target_ratio from public.target_ratio tr limit 1) as target_ratio,

      -- FIX: avoid NULL when expenses=0
      coalesce(round((sum(sales) / nullif(sum(expenses),0)), 2), 0) as actual_ratio,

      coalesce(round(
        ((sum(sales) / nullif(sum(expenses),0)) /
          nullif((select tr.target_ratio from public.target_ratio tr limit 1),0) * 100),
        2
      ), 0) as perf_perc
    from base_filtered
    group by leader_name
  ),

  -- new members from sales table
  new_members as (
    select
      ua.zero_one,
      count(*)::numeric as new_members
    from public.sales s
    join ua_distinct ua
      on regexp_replace(trim(ua.full_name), '\s+', '', 'g')
       = regexp_replace(trim(s.used_by_name), '\s+', '', 'g')
    join date_window w on true
    where
      ua.zero_one is not null
      and coalesce(public.try_ts(s.code_date_created), (now() at time zone 'Asia/Manila'))::date
          between w.d_from and w.d_to
      and coalesce(ua.is_new_member,false) = true
    group by ua.zero_one
  ),

  active_counts as (
    select
      ua.zero_one,
      count(*)::numeric as active_count
    from public.sales_api sa
    join public.user_account ua on ua.user_name = sa.user_name
    join date_window w on true
    where
      sa.code_sku in ('SGGUARD','Synbiotic+ MM')
      and sa.transdate::date between w.d_from and w.d_to
    group by ua.zero_one
  )

  select
    t.leader_name,
    t.avatar,
    t.sales,
    t.expenses,
    t.target_ratio,
    t.actual_ratio,
    t.perf_perc,
    t.bottle_count,
    coalesce(nm.new_members, 0) as new_members,
    coalesce(ac.active_count, 0) as active_count,
    (count(ua.full_name)::numeric - coalesce(ac.active_count,0)) as inactive_count,
    count(ua.full_name)::numeric as member_count,
    rank() over (order by t.perf_perc desc) as rank_number
  from totals t
  left join ua_distinct ua on ua.zero_one = t.leader_name
  left join new_members nm on nm.zero_one = t.leader_name
  left join active_counts ac on ac.zero_one = t.leader_name
  group by
    t.leader_name, t.avatar, t.sales, t.expenses, t.target_ratio,
    t.actual_ratio, t.perf_perc, t.bottle_count,
    nm.new_members, ac.active_count;
$$;


ALTER FUNCTION "public"."rpc_sales_api_performance"("p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sales_report"("p_date_from" "date", "p_date_to" "date") RETURNS TABLE("trans_date" "date", "event_name" "text", "gg_trans_no" "text", "pof_number" "text", "total_sales" numeric, "mode_of_payment" "text", "payment_type" "text", "reference_number" "text", "total_orders" bigint, "new_members" integer, "total_bottles" numeric, "total_blisters" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  with x as (
    select
      ds.event_name,
      ds.trans_date::date as trans_date,
      coalesce(ds.gg_trans_no, '') as gg_trans_no,
      ds.pof_number,

      -- boolean in Supabase (expected)
      coalesce(ds.is_new_member, false) as is_new_member,

      ds.released_count,
      ds.released_blpk_count,
      (coalesce(ds.sales,0) + coalesce(ds.sales_two,0) + coalesce(ds.sales_three,0)) as sales_sum,

      ds.mode_of_payment,
      ds.mode_of_payment_two,
      ds.mode_of_payment_three,

      ds.payment_type,
      ds.payment_type_two,
      ds.payment_type_three,

      ds.reference_number,
      ds.reference_number_two,
      ds.reference_number_three
    from public.daily_sales ds
  )
  select
    x.trans_date,
    x.event_name,
    x.gg_trans_no,
    x.pof_number,
    sum(x.sales_sum) as total_sales,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(x.mode_of_payment, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.mode_of_payment_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.mode_of_payment_three, 'N/A'), ' / '), '')
    ) as mode_of_payment,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(x.payment_type, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.payment_type_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.payment_type_three, 'N/A'), ' / '), '')
    ) as payment_type,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(x.reference_number, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.reference_number_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(x.reference_number_three, 'N/A'), ' / '), '')
    ) as reference_number,

    count(distinct x.pof_number) as total_orders,

    -- FIX: Postgres cannot max(boolean); use bool_or
    case when bool_or(x.is_new_member) then 1 else 0 end as new_members,

    sum(coalesce(x.released_count,0)) as total_bottles,
    sum(coalesce(x.released_blpk_count,0)) as total_blisters

  from x
  where x.trans_date between p_date_from and p_date_to
  group by x.trans_date, x.pof_number, x.event_name, x.gg_trans_no
  order by x.trans_date desc, x.pof_number desc;
$$;


ALTER FUNCTION "public"."rpc_sales_report"("p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_sales_today"("p_date_from" "date", "p_date_to" "date", "p_mode_of_payment" "text") RETURNS TABLE("gg_trans_no" "text", "pof_number" "text", "trans_date" "date", "member_name" "text", "package_type" "text", "quantity" integer, "sales" numeric, "mode_of_payment" "text", "payment_type" "text", "reference_number" "text", "bottle_count" integer, "released_count" integer, "released_blpk_count" integer, "is_new_member" boolean, "zero_one" "text", "pof_status" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    coalesce(ds.gg_trans_no, '') as gg_trans_no,
    ds.pof_number,
    ds.trans_date::date as trans_date,
    ds.member_name,
    ds.package_type,
    ds.quantity,

    case
      when p_mode_of_payment = 'ALL'
        then (coalesce(ds.sales,0) + coalesce(ds.sales_two,0) + coalesce(ds.sales_three,0))
      when ds.mode_of_payment = p_mode_of_payment
        then coalesce(ds.sales,0)
      when ds.mode_of_payment_two = p_mode_of_payment
        then coalesce(ds.sales_two,0)
      when ds.mode_of_payment_three = p_mode_of_payment
        then coalesce(ds.sales_three,0)
      else 0
    end as sales,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(ds.mode_of_payment, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.mode_of_payment_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.mode_of_payment_three, 'N/A'), ' / '), '')
    ) as mode_of_payment,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(ds.payment_type, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.payment_type_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.payment_type_three, 'N/A'), ' / '), '')
    ) as payment_type,

    concat_ws(
      ' / ',
      nullif(string_agg(distinct nullif(ds.reference_number, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.reference_number_two, 'N/A'), ' / '), ''),
      nullif(string_agg(distinct nullif(ds.reference_number_three, 'N/A'), ' / '), '')
    ) as reference_number,

    ds.bottle_count,
    ds.released_count,
    ds.released_blpk_count,
    coalesce(ds.is_new_member, false) as is_new_member,
    ua.zero_one,

    case
      when coalesce(ds.to_follow_count,0) = 0 then 'Released'
      else 'To Follow (' || ds.to_follow_count || ' btl)'
    end as pof_status

  from public.daily_sales ds
  left join public.user_account ua on ua.user_name = ds.username
  where
    ds.trans_date::date between p_date_from and p_date_to
    and (
      p_mode_of_payment = 'ALL'
      or ds.mode_of_payment = p_mode_of_payment
      or ds.mode_of_payment_two = p_mode_of_payment
      or ds.mode_of_payment_three = p_mode_of_payment
    )
  group by
    ds.daily_sales_id,
    ds.trans_date,
    ds.pof_number,
    ds.member_name,
    ds.package_type,
    ds.quantity,
    ds.sales,
    ds.sales_two,
    ds.sales_three,
    ds.mode_of_payment,
    ds.mode_of_payment_two,
    ds.mode_of_payment_three,
    ds.payment_type,
    ds.payment_type_two,
    ds.payment_type_three,
    ds.reference_number,
    ds.reference_number_two,
    ds.reference_number_three,
    ds.bottle_count,
    ds.released_count,
    ds.released_blpk_count,
    ds.is_new_member,
    ds.to_follow_count,
    ua.zero_one
  order by ds.trans_date::date desc, ds.pof_number desc;
$$;


ALTER FUNCTION "public"."rpc_sales_today"("p_date_from" "date", "p_date_to" "date", "p_mode_of_payment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_to_bool"("v" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when v is null then false
    when lower(trim(v)) in ('1','true','t','yes','y') then true
    else false
  end;
$$;


ALTER FUNCTION "public"."rpc_to_bool"("v" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_cash_on_hand"("p_trans_date" "date", "p_pcs_one_thousand" integer, "p_pcs_five_hundred" integer, "p_pcs_two_hundred" integer, "p_pcs_one_hundred" integer, "p_pcs_fifty" integer, "p_pcs_twenty" integer, "p_pcs_ten" integer, "p_pcs_five" integer, "p_pcs_one" integer, "p_pcs_cents" integer) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  insert into public.cash_on_hand (
    trans_date,
    pcs_one_thousand,
    pcs_five_hundred,
    pcs_two_hundred,
    pcs_one_hundred,
    pcs_fifty,
    pcs_twenty,
    pcs_ten,
    pcs_five,
    pcs_one,
    pcs_cents
  ) values (
    p_trans_date,
    coalesce(p_pcs_one_thousand, 0),
    coalesce(p_pcs_five_hundred, 0),
    coalesce(p_pcs_two_hundred, 0),
    coalesce(p_pcs_one_hundred, 0),
    coalesce(p_pcs_fifty, 0),
    coalesce(p_pcs_twenty, 0),
    coalesce(p_pcs_ten, 0),
    coalesce(p_pcs_five, 0),
    coalesce(p_pcs_one, 0),
    coalesce(p_pcs_cents, 0)
  )
  on conflict (trans_date)
  do update set
    pcs_one_thousand = excluded.pcs_one_thousand,
    pcs_five_hundred = excluded.pcs_five_hundred,
    pcs_two_hundred = excluded.pcs_two_hundred,
    pcs_one_hundred = excluded.pcs_one_hundred,
    pcs_fifty = excluded.pcs_fifty,
    pcs_twenty = excluded.pcs_twenty,
    pcs_ten = excluded.pcs_ten,
    pcs_five = excluded.pcs_five,
    pcs_one = excluded.pcs_one,
    pcs_cents = excluded.pcs_cents;
$$;


ALTER FUNCTION "public"."rpc_upsert_cash_on_hand"("p_trans_date" "date", "p_pcs_one_thousand" integer, "p_pcs_five_hundred" integer, "p_pcs_two_hundred" integer, "p_pcs_one_hundred" integer, "p_pcs_fifty" integer, "p_pcs_twenty" integer, "p_pcs_ten" integer, "p_pcs_five" integer, "p_pcs_one" integer, "p_pcs_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_codes"("p_list" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  item jsonb;
begin
  for item in
    select value from jsonb_array_elements(p_list)
  loop
    insert into public.codes
    (
      username,
      full_name,
      code_value,
      code_pin,
      code_sku,
      code_payment,
      code_amount,
      code_status,
      code_date_created,
      code_date_used
    )
    values
    (
      nullif(trim(item->>'username'), ''),
      nullif(trim(item->>'full_name'), ''),
      nullif(trim(item->>'code_value'), ''),
      nullif(trim(item->>'code_pin'), ''),
      nullif(trim(item->>'code_sku'), ''),
      nullif(trim(item->>'code_payment'), ''),
      nullif(item->>'code_amount','')::numeric,
      public.rpc_norm_status(item->>'code_status'),
      nullif(item->>'code_date_created','')::timestamptz,
      nullif(item->>'code_date_used','')::timestamptz
    )
    on conflict on constraint codes_code_value_code_pin_code_sku_key
    do update set
      username = excluded.username,
      full_name = excluded.full_name,
      code_payment = excluded.code_payment,
      code_amount = excluded.code_amount,
      code_status = excluded.code_status,
      code_date_created = coalesce(excluded.code_date_created, public.codes.code_date_created),
      code_date_used = coalesce(excluded.code_date_used, public.codes.code_date_used);
  end loop;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_codes"("p_list" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_gg_codes"("p_list" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  item jsonb;
begin
  for item in
    select value from jsonb_array_elements(p_list)
  loop
    insert into public.gg_codes
    (
      owner_user_name,
      owner_name,
      code_status,
      used_by_user_name,
      used_by_name,
      code_sku,
      code_payment,
      code,
      code_amount,
      code_pin,
      code_date_created
    )
    values
    (
      nullif(trim(item->>'owner_user_name'), ''),
      nullif(trim(item->>'owner_name'), ''),
      public.rpc_norm_status(item->>'code_status'),
      nullif(trim(item->>'used_by_user_name'), ''),
      nullif(trim(item->>'used_by_name'), ''),
      nullif(trim(item->>'code_sku'), ''),
      nullif(trim(item->>'code_payment'), ''),
      nullif(trim(item->>'code'), ''),
      nullif(item->>'code_amount','')::numeric,
      nullif(trim(item->>'code_pin'), ''),
      nullif(trim(item->>'code_date_created'), '')
    )
    on conflict on constraint gg_codes_owner_user_name_owner_name_code_sku_code_code_amou_key
    do update set
      code_status = excluded.code_status,
      used_by_user_name = excluded.used_by_user_name,
      used_by_name = excluded.used_by_name,
      code_payment = excluded.code_payment;
      -- We keep the unique key columns as-is (owner/code/amount/pin/date_created etc.)
  end loop;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_gg_codes"("p_list" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_sales_api_list"("p_list" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  item jsonb;
begin
  -- Accept null/empty lists safely
  if p_list is null or jsonb_typeof(p_list) <> 'array' then
    return;
  end if;

  for item in
    select value from jsonb_array_elements(p_list)
  loop
    insert into public.sales_api
    (
      store_name,
      store_type,
      "user",
      user_name,
      code_sku,
      amount,
      qty,
      transdate
    )
    values
    (
      nullif(trim(item->>'store_name'), ''),
      nullif(trim(item->>'store_type'), ''),
      nullif(trim(item->>'user'), ''),
      nullif(trim(item->>'user_name'), ''),
      nullif(trim(item->>'code_sku'), ''),
      nullif(item->>'amount','')::numeric,
      nullif(item->>'qty','')::int,
      nullif(item->>'transdate','')::timestamptz
    )
    on conflict on constraint sales_api_unique_sync
    do update set
      user_name = excluded.user_name;
  end loop;
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_sales_api_list"("p_list" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_upsert_user_account_list"("i_user_account_list" "jsonb") RETURNS SETOF "public"."user_account"
    LANGUAGE "plpgsql"
    AS $$
declare
  item jsonb;
  v_username text;
  v_full_name_compact text;
begin
  for item in
    select value from jsonb_array_elements(i_user_account_list)
  loop
    v_username := nullif(trim(item->>'username'), '');
    v_full_name_compact := public.rpc_compact_name(item->>'full_name');

    insert into public.user_account
    (
      user_name,
      full_name,
      sponsor,
      placement,
      "group",
      account_type,
      brgy,
      city,
      province,
      region,
      country,
      date_created
    )
    values
    (
      v_username,
      v_full_name_compact,
      item->>'sponsor',
      item->>'placement',
      item->>'group',
      item->>'account_type',
      item->>'brgy',
      item->>'city',
      item->>'province',
      item->>'region',
      item->>'country',
      coalesce(nullif(item->>'date_created','')::timestamptz, now())
    )
    on conflict (user_name) do update
    set
      full_name = excluded.full_name,
      sponsor = excluded.sponsor,
      placement = excluded.placement,
      "group" = excluded."group",
      account_type = excluded.account_type,
      brgy = excluded.brgy,
      city = excluded.city,
      province = excluded.province,
      region = excluded.region,
      country = excluded.country,
      date_created = excluded.date_created;

    update public.daily_sales
    set member_name = v_full_name_compact
    where username = v_username;

  end loop;

  return query
  select * from public.rpc_get_user_acc_no_zero_one(0);
end;
$$;


ALTER FUNCTION "public"."rpc_upsert_user_account_list"("i_user_account_list" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_ts"("p_text" "text") RETURNS timestamp with time zone
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select
    case
      when p_text is null or btrim(p_text) = '' then null
      when p_text ~ '^\d{4}-\d{2}-\d{2}$'
        then (p_text || ' 00:00:00')::timestamp at time zone 'Asia/Manila'
      when p_text ~ '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$'
        then p_text::timestamp at time zone 'Asia/Manila'
      else null
    end;
$_$;


ALTER FUNCTION "public"."try_ts"("p_text" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_on_hand" (
    "coh_id" bigint NOT NULL,
    "trans_date" "date",
    "pcs_one_thousand" integer,
    "pcs_five_hundred" integer,
    "pcs_two_hundred" integer,
    "pcs_one_hundred" integer,
    "pcs_fifty" integer,
    "pcs_twenty" integer,
    "pcs_ten" integer,
    "pcs_five" integer,
    "pcs_one" integer,
    "pcs_cents" integer
);


ALTER TABLE "public"."cash_on_hand" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cash_on_hand_coh_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cash_on_hand_coh_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cash_on_hand_coh_id_seq" OWNED BY "public"."cash_on_hand"."coh_id";



CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "cert_id" bigint NOT NULL,
    "cert_no" "text",
    "full_name" "text",
    "event_name" "text",
    "date_created" timestamp with time zone
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."certificates_cert_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."certificates_cert_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."certificates_cert_id_seq" OWNED BY "public"."certificates"."cert_id";



CREATE SEQUENCE IF NOT EXISTS "public"."codes_code_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."codes_code_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."codes_code_id_seq" OWNED BY "public"."codes"."code_id";



CREATE SEQUENCE IF NOT EXISTS "public"."daily_sales_daily_sales_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."daily_sales_daily_sales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_sales_daily_sales_id_seq" OWNED BY "public"."daily_sales"."daily_sales_id";



CREATE SEQUENCE IF NOT EXISTS "public"."expenses_expense_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."expenses_expense_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."expenses_expense_id_seq" OWNED BY "public"."expenses"."expense_id";



CREATE SEQUENCE IF NOT EXISTS "public"."gg_codes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."gg_codes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."gg_codes_id_seq" OWNED BY "public"."gg_codes"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_movement_daily" (
    "movement_date" "date" NOT NULL,
    "bottle_opening" integer DEFAULT 0 NOT NULL,
    "bottle_in" integer DEFAULT 0 NOT NULL,
    "bottle_out" integer DEFAULT 0 NOT NULL,
    "bottle_closing" integer DEFAULT 0 NOT NULL,
    "blister_opening" integer DEFAULT 0 NOT NULL,
    "blister_in" integer DEFAULT 0 NOT NULL,
    "blister_out" integer DEFAULT 0 NOT NULL,
    "blister_closing" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory_movement_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_stock_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "movement_date" "date" NOT NULL,
    "bottle_in" integer DEFAULT 0 NOT NULL,
    "blister_in" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "inventory_stock_entries_blister_in_check" CHECK (("blister_in" >= 0)),
    CONSTRAINT "inventory_stock_entries_bottle_in_check" CHECK (("bottle_in" >= 0))
);


ALTER TABLE "public"."inventory_stock_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_stock_movements" (
    "inventory_stock_movement_id" bigint NOT NULL,
    "movement_date" "date" NOT NULL,
    "bottle_in" integer DEFAULT 0 NOT NULL,
    "blister_in" integer DEFAULT 0 NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "inventory_stock_movements_blister_in_check" CHECK (("blister_in" >= 0)),
    CONSTRAINT "inventory_stock_movements_bottle_in_check" CHECK (("bottle_in" >= 0))
);


ALTER TABLE "public"."inventory_stock_movements" OWNER TO "postgres";


ALTER TABLE "public"."inventory_stock_movements" ALTER COLUMN "inventory_stock_movement_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_stock_movements_inventory_stock_movement_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."jnt_box_rate" (
    "jnt_box_rate_id" bigint NOT NULL,
    "box_type" "text",
    "measurement" "text",
    "weight" "text",
    "price" numeric(12,2),
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."jnt_box_rate" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."jnt_box_rate_jnt_box_rate_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."jnt_box_rate_jnt_box_rate_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."jnt_box_rate_jnt_box_rate_id_seq" OWNED BY "public"."jnt_box_rate"."jnt_box_rate_id";



CREATE TABLE IF NOT EXISTS "public"."jnt_shipping" (
    "jnt_shipping_id" bigint NOT NULL,
    "weight" "text",
    "location" "text",
    "price" numeric(12,2),
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."jnt_shipping" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."jnt_shipping_jnt_shipping_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."jnt_shipping_jnt_shipping_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."jnt_shipping_jnt_shipping_id_seq" OWNED BY "public"."jnt_shipping"."jnt_shipping_id";



CREATE TABLE IF NOT EXISTS "public"."leader" (
    "leader_id" bigint NOT NULL,
    "leader_name" "text",
    "is_active" boolean DEFAULT true,
    "avatar" "text",
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."leader" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leader_leader_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."leader_leader_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leader_leader_id_seq" OWNED BY "public"."leader"."leader_id";



CREATE TABLE IF NOT EXISTS "public"."metrics" (
    "metrics_id" bigint NOT NULL,
    "leader_id" bigint,
    "sales" numeric(12,2),
    "sales_date" "date",
    "expense" numeric(12,2),
    "expense_date" "date",
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."metrics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."metrics_metrics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."metrics_metrics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."metrics_metrics_id_seq" OWNED BY "public"."metrics"."metrics_id";



ALTER TABLE "public"."request_forms" ALTER COLUMN "request_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."request_forms_request_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales" (
    "sales_id" bigint NOT NULL,
    "owner_user_name" "text",
    "owner_name" "text",
    "used_by_user_name" "text",
    "used_by_name" "text",
    "code_status" "text",
    "code_sku" "text",
    "code_payment" "text",
    "code_amount" numeric(12,2),
    "code_pin" "text",
    "code_date_created" "text",
    "date_created" timestamp with time zone,
    "date_updated" timestamp with time zone
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_api" (
    "id" bigint NOT NULL,
    "store_name" "text",
    "store_type" "text",
    "user" "text",
    "user_name" "text",
    "code_sku" "text",
    "amount" numeric(12,2),
    "qty" integer,
    "transdate" timestamp with time zone
);


ALTER TABLE "public"."sales_api" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sales_api_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_api_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sales_api_id_seq" OWNED BY "public"."sales_api"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."sales_sales_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_sales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sales_sales_id_seq" OWNED BY "public"."sales"."sales_id";



CREATE TABLE IF NOT EXISTS "public"."target_ratio" (
    "id" integer DEFAULT 1 NOT NULL,
    "target_ratio" numeric(12,2)
);


ALTER TABLE "public"."target_ratio" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_account_user_account_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_account_user_account_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_account_user_account_id_seq" OWNED BY "public"."user_account"."user_account_id";



CREATE TABLE IF NOT EXISTS "public"."user_api" (
    "user_api_id" bigint NOT NULL,
    "full_name" "text",
    "username" "text",
    "password" "text",
    "sponsored" integer,
    "registered" "text",
    "telegram_id" "text",
    "role" "text",
    "date_created" timestamp with time zone
);


ALTER TABLE "public"."user_api" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_api_user_api_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_api_user_api_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_api_user_api_id_seq" OWNED BY "public"."user_api"."user_api_id";



CREATE TABLE IF NOT EXISTS "public"."user_type" (
    "user_type_id" bigint NOT NULL,
    "username" "text",
    "user_type" "text",
    "sponsor" "text",
    "date_created" timestamp with time zone
);


ALTER TABLE "public"."user_type" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_type_user_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_type_user_type_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_type_user_type_id_seq" OWNED BY "public"."user_type"."user_type_id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" bigint NOT NULL,
    "name" "text",
    "zero_one" "text",
    "zero_one_avatar" "text",
    "code_payment" "text",
    "username" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_new" (
    "user_id" bigint NOT NULL,
    "name" "text",
    "zero_one" "text",
    "zero_one_avatar" "text",
    "code_payment" "text"
);


ALTER TABLE "public"."users_new" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_user_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_user_id_seq" OWNED BY "public"."users"."user_id";



CREATE OR REPLACE VIEW "public"."vw_daily_sales_payment" AS
 WITH "combined_sales" AS (
         SELECT "daily_sales"."pof_number",
            "daily_sales"."mode_of_payment",
            "daily_sales"."payment_type",
            "daily_sales"."reference_number",
            "daily_sales"."sales"
           FROM "public"."daily_sales"
          WHERE (COALESCE("daily_sales"."sales", (0)::numeric) > (0)::numeric)
        UNION ALL
         SELECT "daily_sales"."pof_number",
            "daily_sales"."mode_of_payment_two",
            "daily_sales"."payment_type_two",
            "daily_sales"."reference_number_two",
            "daily_sales"."sales_two"
           FROM "public"."daily_sales"
          WHERE (COALESCE("daily_sales"."sales_two", (0)::numeric) > (0)::numeric)
        UNION ALL
         SELECT "daily_sales"."pof_number",
            "daily_sales"."mode_of_payment_three",
            "daily_sales"."payment_type_three",
            "daily_sales"."reference_number_three",
            "daily_sales"."sales_three"
           FROM "public"."daily_sales"
          WHERE (COALESCE("daily_sales"."sales_three", (0)::numeric) > (0)::numeric)
        ), "x" AS (
         SELECT "combined_sales"."pof_number",
            "combined_sales"."mode_of_payment",
            "combined_sales"."payment_type",
            "combined_sales"."reference_number",
            "sum"("combined_sales"."sales") AS "total_sales"
           FROM "combined_sales"
          GROUP BY "combined_sales"."pof_number", "combined_sales"."mode_of_payment", "combined_sales"."payment_type", "combined_sales"."reference_number"
        )
 SELECT "pof_number",
    "string_agg"(DISTINCT NULLIF("concat"("mode_of_payment",
        CASE
            WHEN ("payment_type" = 'CREDITCARD'::"text") THEN ' (CC)'::"text"
            ELSE ''::"text"
        END, ' : ', "total_sales"), 'N/A'::"text"), ' / '::"text") AS "payments"
   FROM "x"
  GROUP BY "pof_number";


ALTER VIEW "public"."vw_daily_sales_payment" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_daily_sales_payments_norm" AS
 SELECT "ds"."trans_date",
    "ds"."pof_number",
    "ds"."username",
    "ds"."member_name",
    "ds"."package_type",
    1 AS "payment_slot",
    "ds"."mode_of_payment",
    "ds"."payment_type",
    "ds"."reference_number",
    COALESCE("ds"."sales", (0)::numeric) AS "amount"
   FROM "public"."daily_sales" "ds"
  WHERE (COALESCE("ds"."sales", (0)::numeric) > (0)::numeric)
UNION ALL
 SELECT "ds"."trans_date",
    "ds"."pof_number",
    "ds"."username",
    "ds"."member_name",
    "ds"."package_type",
    2 AS "payment_slot",
    "ds"."mode_of_payment_two" AS "mode_of_payment",
    "ds"."payment_type_two" AS "payment_type",
    "ds"."reference_number_two" AS "reference_number",
    COALESCE("ds"."sales_two", (0)::numeric) AS "amount"
   FROM "public"."daily_sales" "ds"
  WHERE (COALESCE("ds"."sales_two", (0)::numeric) > (0)::numeric)
UNION ALL
 SELECT "ds"."trans_date",
    "ds"."pof_number",
    "ds"."username",
    "ds"."member_name",
    "ds"."package_type",
    3 AS "payment_slot",
    "ds"."mode_of_payment_three" AS "mode_of_payment",
    "ds"."payment_type_three" AS "payment_type",
    "ds"."reference_number_three" AS "reference_number",
    COALESCE("ds"."sales_three", (0)::numeric) AS "amount"
   FROM "public"."daily_sales" "ds"
  WHERE (COALESCE("ds"."sales_three", (0)::numeric) > (0)::numeric);


ALTER VIEW "public"."vw_daily_sales_payments_norm" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cash_on_hand" ALTER COLUMN "coh_id" SET DEFAULT "nextval"('"public"."cash_on_hand_coh_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."certificates" ALTER COLUMN "cert_id" SET DEFAULT "nextval"('"public"."certificates_cert_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."codes" ALTER COLUMN "code_id" SET DEFAULT "nextval"('"public"."codes_code_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."daily_sales" ALTER COLUMN "daily_sales_id" SET DEFAULT "nextval"('"public"."daily_sales_daily_sales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."expenses" ALTER COLUMN "expense_id" SET DEFAULT "nextval"('"public"."expenses_expense_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."gg_codes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."gg_codes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."jnt_box_rate" ALTER COLUMN "jnt_box_rate_id" SET DEFAULT "nextval"('"public"."jnt_box_rate_jnt_box_rate_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."jnt_shipping" ALTER COLUMN "jnt_shipping_id" SET DEFAULT "nextval"('"public"."jnt_shipping_jnt_shipping_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."leader" ALTER COLUMN "leader_id" SET DEFAULT "nextval"('"public"."leader_leader_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."metrics" ALTER COLUMN "metrics_id" SET DEFAULT "nextval"('"public"."metrics_metrics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sales" ALTER COLUMN "sales_id" SET DEFAULT "nextval"('"public"."sales_sales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sales_api" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sales_api_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_account" ALTER COLUMN "user_account_id" SET DEFAULT "nextval"('"public"."user_account_user_account_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_api" ALTER COLUMN "user_api_id" SET DEFAULT "nextval"('"public"."user_api_user_api_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_type" ALTER COLUMN "user_type_id" SET DEFAULT "nextval"('"public"."user_type_user_type_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "user_id" SET DEFAULT "nextval"('"public"."users_user_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cash_on_hand"
    ADD CONSTRAINT "cash_on_hand_pkey" PRIMARY KEY ("coh_id");



ALTER TABLE ONLY "public"."cash_on_hand"
    ADD CONSTRAINT "cash_on_hand_trans_date_key" UNIQUE ("trans_date");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_cert_no_full_name_key" UNIQUE ("cert_no", "full_name");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("cert_id");



ALTER TABLE ONLY "public"."codes"
    ADD CONSTRAINT "codes_code_value_code_pin_code_sku_key" UNIQUE ("code_value", "code_pin", "code_sku");



ALTER TABLE ONLY "public"."codes"
    ADD CONSTRAINT "codes_pkey" PRIMARY KEY ("code_id");



ALTER TABLE ONLY "public"."daily_sales"
    ADD CONSTRAINT "daily_sales_pkey" PRIMARY KEY ("daily_sales_id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id");



ALTER TABLE ONLY "public"."gg_codes"
    ADD CONSTRAINT "gg_codes_owner_user_name_owner_name_code_sku_code_code_amou_key" UNIQUE ("owner_user_name", "owner_name", "code_sku", "code", "code_amount", "code_pin", "code_date_created");



ALTER TABLE ONLY "public"."gg_codes"
    ADD CONSTRAINT "gg_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movement_daily"
    ADD CONSTRAINT "inventory_movement_daily_pkey" PRIMARY KEY ("movement_date");



ALTER TABLE ONLY "public"."inventory_stock_entries"
    ADD CONSTRAINT "inventory_stock_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY ("inventory_stock_movement_id");



ALTER TABLE ONLY "public"."jnt_box_rate"
    ADD CONSTRAINT "jnt_box_rate_pkey" PRIMARY KEY ("jnt_box_rate_id");



ALTER TABLE ONLY "public"."jnt_shipping"
    ADD CONSTRAINT "jnt_shipping_pkey" PRIMARY KEY ("jnt_shipping_id");



ALTER TABLE ONLY "public"."leader"
    ADD CONSTRAINT "leader_leader_name_key" UNIQUE ("leader_name");



ALTER TABLE ONLY "public"."leader"
    ADD CONSTRAINT "leader_pkey" PRIMARY KEY ("leader_id");



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_pkey" PRIMARY KEY ("metrics_id");



ALTER TABLE ONLY "public"."request_forms"
    ADD CONSTRAINT "request_forms_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."sales_api"
    ADD CONSTRAINT "sales_api_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_api"
    ADD CONSTRAINT "sales_api_unique_sync" UNIQUE ("user", "code_sku", "transdate", "amount", "qty", "store_name", "store_type");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("sales_id");



ALTER TABLE ONLY "public"."target_ratio"
    ADD CONSTRAINT "target_ratio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "user_account_pkey" PRIMARY KEY ("user_account_id");



ALTER TABLE ONLY "public"."user_account"
    ADD CONSTRAINT "user_account_user_name_key" UNIQUE ("user_name");



ALTER TABLE ONLY "public"."user_api"
    ADD CONSTRAINT "user_api_pkey" PRIMARY KEY ("user_api_id");



ALTER TABLE ONLY "public"."user_type"
    ADD CONSTRAINT "user_type_pkey" PRIMARY KEY ("user_type_id");



ALTER TABLE ONLY "public"."user_type"
    ADD CONSTRAINT "user_type_username_sponsor_key" UNIQUE ("username", "sponsor");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_name_zero_one_key" UNIQUE ("name", "zero_one");



ALTER TABLE ONLY "public"."users_new"
    ADD CONSTRAINT "users_new_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "certificates_cert_no_idx" ON "public"."certificates" USING "btree" ("cert_no");



CREATE UNIQUE INDEX "certificates_unique_key" ON "public"."certificates" USING "btree" ("cert_no", "full_name");



CREATE INDEX "codes_code_sku_idx" ON "public"."codes" USING "btree" ("code_sku");



CREATE INDEX "codes_code_status_idx" ON "public"."codes" USING "btree" ("code_status");



CREATE UNIQUE INDEX "codes_unique_key" ON "public"."codes" USING "btree" ("code_value", "code_pin", "code_sku");



CREATE INDEX "codes_username_idx" ON "public"."codes" USING "btree" ("username");



CREATE INDEX "daily_sales_mode_of_payment_idx" ON "public"."daily_sales" USING "btree" ("mode_of_payment");



CREATE INDEX "daily_sales_trans_date_idx" ON "public"."daily_sales" USING "btree" ("trans_date");



CREATE INDEX "daily_sales_username_idx" ON "public"."daily_sales" USING "btree" ("username");



CREATE INDEX "expenses_date_idx" ON "public"."expenses" USING "btree" ("expense_date");



CREATE INDEX "expenses_expense_date_idx" ON "public"."expenses" USING "btree" ("expense_date");



CREATE UNIQUE INDEX "expenses_unique_guess" ON "public"."expenses" USING "btree" ("zero_one", "expense_name", "amount", "expense_date");



CREATE INDEX "expenses_zero_one_idx" ON "public"."expenses" USING "btree" ("zero_one");



CREATE INDEX "gg_codes_code_sku_idx" ON "public"."gg_codes" USING "btree" ("code_sku");



CREATE INDEX "gg_codes_owner_user_name_idx" ON "public"."gg_codes" USING "btree" ("owner_user_name");



CREATE INDEX "gg_codes_used_by_user_name_idx" ON "public"."gg_codes" USING "btree" ("used_by_user_name");



CREATE INDEX "inventory_stock_entries_movement_date_idx" ON "public"."inventory_stock_entries" USING "btree" ("movement_date" DESC);



CREATE INDEX "inventory_stock_movements_created_at_idx" ON "public"."inventory_stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "inventory_stock_movements_movement_date_idx" ON "public"."inventory_stock_movements" USING "btree" ("movement_date");



CREATE INDEX "jnt_shipping_location_idx" ON "public"."jnt_shipping" USING "btree" ("location");



CREATE INDEX "leader_is_active_idx" ON "public"."leader" USING "btree" ("is_active");



CREATE INDEX "metrics_expense_date_idx" ON "public"."metrics" USING "btree" ("expense_date");



CREATE INDEX "metrics_leader_id_idx" ON "public"."metrics" USING "btree" ("leader_id");



CREATE INDEX "metrics_sales_date_idx" ON "public"."metrics" USING "btree" ("sales_date");



CREATE INDEX "request_forms_date_created_idx" ON "public"."request_forms" USING "btree" ("date_created");



CREATE INDEX "request_forms_username_idx" ON "public"."request_forms" USING "btree" ("username");



CREATE INDEX "sales_api_transdate_idx" ON "public"."sales_api" USING "btree" ("transdate");



CREATE UNIQUE INDEX "sales_api_unique_tx" ON "public"."sales_api" USING "btree" ("store_name", "user", "code_sku", "transdate");



CREATE INDEX "sales_code_sku_idx" ON "public"."sales" USING "btree" ("code_sku");



CREATE INDEX "sales_owner_user_name_idx" ON "public"."sales" USING "btree" ("owner_user_name");



CREATE INDEX "sales_used_by_user_name_idx" ON "public"."sales" USING "btree" ("used_by_user_name");



CREATE INDEX "user_account_placement_idx" ON "public"."user_account" USING "btree" ("placement");



CREATE INDEX "user_account_sponsor_idx" ON "public"."user_account" USING "btree" ("sponsor");



CREATE UNIQUE INDEX "user_account_user_name_unique" ON "public"."user_account" USING "btree" ("user_name");



CREATE INDEX "user_account_zero_one_idx" ON "public"."user_account" USING "btree" ("zero_one");



CREATE UNIQUE INDEX "user_api_username_unique" ON "public"."user_api" USING "btree" ("username");



CREATE INDEX "user_type_sponsor_idx" ON "public"."user_type" USING "btree" ("sponsor");



CREATE INDEX "user_type_username_idx" ON "public"."user_type" USING "btree" ("username");



CREATE UNIQUE INDEX "users_name_zero_one_unique" ON "public"."users" USING "btree" ("name", "zero_one");



CREATE UNIQUE INDEX "users_username_unique_idx" ON "public"."users" USING "btree" ("username") WHERE ("username" IS NOT NULL);



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_leader_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."leader"("leader_id");



ALTER TABLE "public"."cash_on_hand" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dev_full_access" ON "public"."cash_on_hand" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."certificates" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."codes" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."daily_sales" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."expenses" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."gg_codes" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."jnt_box_rate" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."jnt_shipping" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."leader" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."metrics" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."request_forms" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."sales" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."sales_api" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."target_ratio" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."user_account" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."user_api" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."user_type" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access" ON "public"."users" USING (true) WITH CHECK (true);



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gg_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movement_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_stock_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jnt_box_rate" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jnt_shipping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leader" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_api" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."target_ratio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_api" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_type" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_new" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."append_next_inventory_movement_day"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_next_inventory_movement_day"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_next_inventory_movement_day"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_inventory_movement_daily"() TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_inventory_movement_daily"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_inventory_movement_daily"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."daily_sales" TO "anon";
GRANT ALL ON TABLE "public"."daily_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_sales" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_daily_sales"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_daily_sales"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_daily_sales"("p" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_expenses"("i_zero_one" "text", "i_expense_name" "text", "i_amount" numeric, "i_remarks" "text", "i_expense_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_expenses"("i_zero_one" "text", "i_expense_name" "text", "i_amount" numeric, "i_remarks" "text", "i_expense_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_expenses"("i_zero_one" "text", "i_expense_name" "text", "i_amount" numeric, "i_remarks" "text", "i_expense_date" "date") TO "service_role";



GRANT ALL ON TABLE "public"."request_forms" TO "anon";
GRANT ALL ON TABLE "public"."request_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."request_forms" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_add_request_form"("p_control_no" "text", "p_request_type" "text", "p_username" "text", "p_contact_no" "text", "p_change_into" "text", "p_remarks" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_add_request_form"("p_control_no" "text", "p_request_type" "text", "p_username" "text", "p_contact_no" "text", "p_change_into" "text", "p_remarks" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_add_request_form"("p_control_no" "text", "p_request_type" "text", "p_username" "text", "p_contact_no" "text", "p_change_into" "text", "p_remarks" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_cash_on_hand_total"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_cash_on_hand_total"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_cash_on_hand_total"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_compact_name"("v" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_compact_name"("v" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_compact_name"("v" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_inventory"("p_date_from" "date", "p_date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_inventory"("p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_inventory"("p_date_from" "date", "p_date_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arcsa"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arcsa"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arcsa"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arleadersupport"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arleadersupport"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_arleadersupport"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_bank"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_bank"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_bank"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_cheque"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_cheque"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_cheque"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_credit_card"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_credit_card"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_credit_card"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_epoints"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_epoints"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_epoints"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_ewallet"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_ewallet"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_ewallet"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaatc"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaatc"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaatc"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaigi"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaigi"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_mayaigi"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectatc"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectatc"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectatc"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectigi"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectigi"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_daily_sales_sbcollectigi"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_cash_on_hand"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_on_hand"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_cash_on_hand"("p_trans_date" "date") TO "service_role";



GRANT ALL ON TABLE "public"."codes" TO "anon";
GRANT ALL ON TABLE "public"."codes" TO "authenticated";
GRANT ALL ON TABLE "public"."codes" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_code_value"("p_code_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_code_value"("p_code_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_code_value"("p_code_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_codes_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_expenses"("i_expense_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_expenses"("i_expense_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_expenses"("i_expense_id" bigint) TO "service_role";



GRANT ALL ON TABLE "public"."gg_codes" TO "anon";
GRANT ALL ON TABLE "public"."gg_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."gg_codes" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_owner"("p_owner_user_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_owner"("p_owner_user_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_owner"("p_owner_user_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_used_by"("p_used_by_user_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_used_by"("p_used_by_user_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_gg_codes_by_used_by"("p_used_by_user_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_request_forms"("p_request_id" bigint, "p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_request_forms"("p_request_id" bigint, "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_request_forms"("p_request_id" bigint, "p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_target_ratio"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_target_ratio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_target_ratio"() TO "service_role";



GRANT ALL ON TABLE "public"."user_account" TO "anon";
GRANT ALL ON TABLE "public"."user_account" TO "authenticated";
GRANT ALL ON TABLE "public"."user_account" TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_user_acc_no_zero_one"("i_user_account_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_user_acc_no_zero_one"("i_user_account_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_user_acc_no_zero_one"("i_user_account_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales"("p" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_gg_trans_no" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_gg_trans_no" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_gg_trans_no" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_modify_daily_sales_gg_trans_no"("p_daily_sales_id" bigint, "p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one"("p_user_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one"("p_user_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one"("p_user_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one_by_full_name"("p_full_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one_by_full_name"("p_full_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_modify_user_zero_one_by_full_name"("p_full_name" "text", "p_zero_one" "text", "p_code_payment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_norm_status"("v" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_norm_status"("v" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_norm_status"("v" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_package_retail"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_package_retail"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_package_retail"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_payment_breakdown"("p_trans_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_payment_breakdown"("p_trans_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_payment_breakdown"("p_trans_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_remove_pof"("i_pof_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_remove_pof"("i_pof_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_remove_pof"("i_pof_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sales_api_performance"("p_date_from" "date", "p_date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sales_api_performance"("p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sales_api_performance"("p_date_from" "date", "p_date_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sales_report"("p_date_from" "date", "p_date_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sales_report"("p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sales_report"("p_date_from" "date", "p_date_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_sales_today"("p_date_from" "date", "p_date_to" "date", "p_mode_of_payment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_sales_today"("p_date_from" "date", "p_date_to" "date", "p_mode_of_payment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_sales_today"("p_date_from" "date", "p_date_to" "date", "p_mode_of_payment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_to_bool"("v" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_to_bool"("v" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_to_bool"("v" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_on_hand"("p_trans_date" "date", "p_pcs_one_thousand" integer, "p_pcs_five_hundred" integer, "p_pcs_two_hundred" integer, "p_pcs_one_hundred" integer, "p_pcs_fifty" integer, "p_pcs_twenty" integer, "p_pcs_ten" integer, "p_pcs_five" integer, "p_pcs_one" integer, "p_pcs_cents" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_on_hand"("p_trans_date" "date", "p_pcs_one_thousand" integer, "p_pcs_five_hundred" integer, "p_pcs_two_hundred" integer, "p_pcs_one_hundred" integer, "p_pcs_fifty" integer, "p_pcs_twenty" integer, "p_pcs_ten" integer, "p_pcs_five" integer, "p_pcs_one" integer, "p_pcs_cents" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_cash_on_hand"("p_trans_date" "date", "p_pcs_one_thousand" integer, "p_pcs_five_hundred" integer, "p_pcs_two_hundred" integer, "p_pcs_one_hundred" integer, "p_pcs_fifty" integer, "p_pcs_twenty" integer, "p_pcs_ten" integer, "p_pcs_five" integer, "p_pcs_one" integer, "p_pcs_cents" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_codes"("p_list" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_codes"("p_list" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_codes"("p_list" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_gg_codes"("p_list" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_gg_codes"("p_list" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_gg_codes"("p_list" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_sales_api_list"("p_list" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_sales_api_list"("p_list" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_sales_api_list"("p_list" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_upsert_user_account_list"("i_user_account_list" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_upsert_user_account_list"("i_user_account_list" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_upsert_user_account_list"("i_user_account_list" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."try_ts"("p_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."try_ts"("p_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_ts"("p_text" "text") TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."cash_on_hand" TO "anon";
GRANT ALL ON TABLE "public"."cash_on_hand" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_on_hand" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_on_hand_coh_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_on_hand_coh_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_on_hand_coh_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."certificates_cert_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."certificates_cert_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."certificates_cert_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."codes_code_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."codes_code_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."codes_code_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_sales_daily_sales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_sales_daily_sales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_sales_daily_sales_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."expenses_expense_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_expense_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_expense_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."gg_codes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gg_codes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gg_codes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movement_daily" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movement_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movement_daily" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock_entries" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock_entries" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_stock_movements_inventory_stock_movement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_stock_movements_inventory_stock_movement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_stock_movements_inventory_stock_movement_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jnt_box_rate" TO "anon";
GRANT ALL ON TABLE "public"."jnt_box_rate" TO "authenticated";
GRANT ALL ON TABLE "public"."jnt_box_rate" TO "service_role";



GRANT ALL ON SEQUENCE "public"."jnt_box_rate_jnt_box_rate_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."jnt_box_rate_jnt_box_rate_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."jnt_box_rate_jnt_box_rate_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jnt_shipping" TO "anon";
GRANT ALL ON TABLE "public"."jnt_shipping" TO "authenticated";
GRANT ALL ON TABLE "public"."jnt_shipping" TO "service_role";



GRANT ALL ON SEQUENCE "public"."jnt_shipping_jnt_shipping_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."jnt_shipping_jnt_shipping_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."jnt_shipping_jnt_shipping_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leader" TO "anon";
GRANT ALL ON TABLE "public"."leader" TO "authenticated";
GRANT ALL ON TABLE "public"."leader" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leader_leader_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leader_leader_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leader_leader_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."metrics" TO "anon";
GRANT ALL ON TABLE "public"."metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."metrics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."metrics_metrics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."metrics_metrics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."metrics_metrics_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."request_forms_request_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."request_forms_request_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."request_forms_request_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."sales_api" TO "anon";
GRANT ALL ON TABLE "public"."sales_api" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_api" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_api_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_api_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_api_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_sales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_sales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_sales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."target_ratio" TO "anon";
GRANT ALL ON TABLE "public"."target_ratio" TO "authenticated";
GRANT ALL ON TABLE "public"."target_ratio" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_account_user_account_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_account_user_account_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_account_user_account_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_api" TO "anon";
GRANT ALL ON TABLE "public"."user_api" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_api_user_api_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_api_user_api_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_api_user_api_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_type" TO "anon";
GRANT ALL ON TABLE "public"."user_type" TO "authenticated";
GRANT ALL ON TABLE "public"."user_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_type_user_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_type_user_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_type_user_type_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."users_new" TO "anon";
GRANT ALL ON TABLE "public"."users_new" TO "authenticated";
GRANT ALL ON TABLE "public"."users_new" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vw_daily_sales_payment" TO "anon";
GRANT ALL ON TABLE "public"."vw_daily_sales_payment" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_daily_sales_payment" TO "service_role";



GRANT ALL ON TABLE "public"."vw_daily_sales_payments_norm" TO "anon";
GRANT ALL ON TABLE "public"."vw_daily_sales_payments_norm" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_daily_sales_payments_norm" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































