-- Billing core tables: vendors, bills, bill_breakdowns, bill_attachments
-- Ported from BillingSystem. See src/types/billing.ts and src/services/bills.service.ts.

create extension if not exists "pgcrypto";

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create index if not exists vendors_name_idx on public.vendors (name);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  reference_no text not null unique,
  request_date date not null,
  priority_level text not null check (priority_level in ('urgent', 'high', 'standard', 'low')),
  payment_method text not null check (payment_method in ('bank_transfer', 'check', 'cash', 'other')),
  bank_name text,
  bank_account_name text,
  bank_account_no text,
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'rejected', 'approved', 'paid', 'void')),
  remarks text,
  rejection_reason text,
  total_amount numeric(14, 2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_vendor_id_idx on public.bills (vendor_id);
create index if not exists bills_status_idx on public.bills (status);
create index if not exists bills_request_date_idx on public.bills (request_date desc);
create index if not exists bills_reference_no_idx on public.bills (reference_no);

create table if not exists public.bill_breakdowns (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  payment_method text not null check (payment_method in ('bank_transfer', 'check', 'cash', 'other')),
  category text,
  description text default '',
  amount numeric(14, 2) not null default 0,
  bank_name text,
  bank_account_name text,
  bank_account_no text,
  created_at timestamptz not null default now()
);

create index if not exists bill_breakdowns_bill_id_idx on public.bill_breakdowns (bill_id);

create table if not exists public.bill_attachments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists bill_attachments_bill_id_idx on public.bill_attachments (bill_id);

-- updated_at trigger for bills
create or replace function public.set_bills_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
  before update on public.bills
  for each row execute function public.set_bills_updated_at();

-- Reference-number generator: BL-YYYYMM-#### per month, padded to 4 digits.
-- Adjust the format if your historical BillingSystem prefix differs.
create or replace function public.generate_reference_no(p_request_date date default current_date)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_count integer;
  v_ref text;
begin
  v_prefix := 'BL-' || to_char(p_request_date, 'YYYYMM') || '-';

  select count(*) + 1
    into v_count
    from public.bills
    where reference_no like v_prefix || '%';

  v_ref := v_prefix || lpad(v_count::text, 4, '0');

  -- Guarantee uniqueness in the unlikely race window
  while exists (select 1 from public.bills where reference_no = v_ref) loop
    v_count := v_count + 1;
    v_ref := v_prefix || lpad(v_count::text, 4, '0');
  end loop;

  return v_ref;
end;
$$;
