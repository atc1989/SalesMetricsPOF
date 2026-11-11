-- Editable SKU pricing for the POF encoder (SKU Management page).
-- A package type with no row falls back to the defaults in src/lib/dailySalesPackages.ts.
create table if not exists public.sku_prices (
  package_type text primary key,
  original_price numeric(12,2) not null check (original_price >= 0),
  distributor_discount numeric(12,2) not null default 0 check (distributor_discount >= 0),
  stockist_discount numeric(12,2) not null default 0 check (stockist_discount >= 0),
  city_stockist_discount numeric(12,2) not null default 0 check (city_stockist_discount >= 0),
  center_discount numeric(12,2) not null default 0 check (center_discount >= 0),
  updated_at timestamptz not null default now()
);

-- Service-role only (API routes); no client policies.
alter table public.sku_prices enable row level security;
