-- PCF (Petty Cash Fund) transactions table.
-- Ports schema implied by src/services/pcf.service.ts and src/types/billing.ts,
-- plus columns added in BillingSystem migration 20260420_add_pcf_status_and_liquidation.sql.

create table if not exists public.pcf_transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  pcv_number text,
  payee text,
  invoice_no text,
  description text,
  amount_in numeric(14, 2) not null default 0,
  amount_out numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  transaction_type text not null check (transaction_type in ('beginning_balance', 'replenishment', 'expense')),
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'rejected', 'approved', 'paid', 'void')),
  is_liquidated boolean not null default false,
  liquidated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pcf_transactions_date_idx on public.pcf_transactions (date desc);
create index if not exists pcf_transactions_status_idx on public.pcf_transactions (status);
create index if not exists pcf_transactions_is_liquidated_idx on public.pcf_transactions (is_liquidated);
create index if not exists pcf_transactions_type_idx on public.pcf_transactions (transaction_type);

create or replace function public.set_pcf_transactions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pcf_transactions_updated_at on public.pcf_transactions;
create trigger trg_pcf_transactions_updated_at
  before update on public.pcf_transactions
  for each row execute function public.set_pcf_transactions_updated_at();
