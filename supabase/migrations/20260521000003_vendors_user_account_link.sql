-- Link vendors to user_account members.
--
-- Billing records (bills -> vendors) and sales records (daily_sales ->
-- user_account) live in separate identity spaces. To build a per-member
-- rollup ("for member X: their sales + any bills tied to them") we need a
-- real key between a vendor (a billing payee) and a user_account member.
--
-- This adds a nullable vendors.user_account_id foreign key and does a
-- conservative best-effort backfill. Fuzzy matching of the remainder is
-- handled by scripts/link-vendors-to-accounts.ts.

alter table public.vendors
  add column if not exists user_account_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendors_user_account_id_fkey'
  ) then
    alter table public.vendors
      add constraint vendors_user_account_id_fkey
      foreign key (user_account_id)
      references public.user_account(user_account_id)
      on delete set null;
  end if;
end$$;

create index if not exists vendors_user_account_id_idx
  on public.vendors (user_account_id);

-- Best-effort backfill: link vendors whose name exactly matches a single
-- user_account.full_name once both sides are upper-cased, trimmed, and have
-- internal whitespace collapsed. Vendors that match zero accounts, or match
-- more than one account, are left NULL on purpose — run
-- scripts/link-vendors-to-accounts.ts for fuzzy matching + manual review of
-- the remainder. Idempotent: only fills rows that are currently NULL.
with normalized_accounts as (
  select
    user_account_id,
    upper(regexp_replace(trim(full_name), '\s+', ' ', 'g')) as norm_name
  from public.user_account
  where full_name is not null
    and trim(full_name) <> ''
),
unique_accounts as (
  select norm_name, min(user_account_id) as user_account_id
  from normalized_accounts
  group by norm_name
  having count(*) = 1
)
update public.vendors v
set user_account_id = ua.user_account_id
from unique_accounts ua
where v.user_account_id is null
  and upper(regexp_replace(trim(v.name), '\s+', ' ', 'g')) = ua.norm_name;
