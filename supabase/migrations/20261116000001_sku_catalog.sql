-- SKU Management becomes the product catalog: products can be added and archived.
-- Built-in SKUs keep their code defaults in src/lib/dailySalesPackages.ts as a fallback.
alter table public.sku_prices
  add column if not exists label text,
  add column if not exists category text not null default 'package',
  add column if not exists bottle_count integer not null default 0 check (bottle_count >= 0),
  add column if not exists bundled_blister_count integer not null default 0 check (bundled_blister_count >= 0),
  add column if not exists default_is_to_blister boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_builtin boolean not null default false;

-- Seed built-ins. Existing rows keep their edited price/discounts; only catalog fields are filled.
insert into public.sku_prices (
  package_type, label, category, bottle_count, bundled_blister_count, default_is_to_blister,
  sort_order, is_builtin, original_price,
  distributor_discount, stockist_discount, city_stockist_discount, center_discount
) values
  ('SILVER', 'Silver (1 bottle)', 'package', 1, 0, false, 10, true, 4500, 0, 50, 180, 240),
  ('GOLD', 'Gold (3 bottles)', 'package', 3, 0, false, 20, true, 13500, 0, 150, 540, 720),
  ('PLATINUM', 'Platinum (11 bottles)', 'package', 11, 0, false, 30, true, 45000, 0, 500, 1800, 2400),
  ('OLD_SILVER', 'Old Silver (1 blister)', 'package', 0, 1, true, 40, true, 1000, 0, 0, 0, 0),
  ('OLD_GOLD', 'Old Gold (3 blisters)', 'package', 0, 3, true, 50, true, 3000, 0, 0, 0, 0),
  ('OLD_PLATINUM', 'Old Platinum (10 blisters)', 'package', 0, 10, true, 60, true, 10000, 0, 0, 0, 0),
  ('USILVERGOLD', 'USilverGold (2 bottles)', 'package', 2, 0, false, 70, true, 9000, 0, 100, 360, 480),
  ('UGOLDPLATINUM', 'UGoldPlatinum (7 bottles)', 'package', 7, 0, false, 80, true, 31500, 0, 350, 1260, 1680),
  ('USILVERPLATINUM', 'USilverPlatinum (9 bottles)', 'package', 9, 0, false, 90, true, 40500, 0, 450, 1620, 2160),
  ('RETAIL', 'Retail (1 bottle)', 'retail', 1, 0, false, 100, true, 4300, 1720, 1935, 2042, 2150),
  ('RETAIL_MM', 'Retail MM (1 bottle)', 'retail', 1, 0, false, 110, true, 4300, 1720, 2210, 2305, 2400),
  ('BLISTER', 'Blister (1 blister pack)', 'retail', 0, 1, true, 120, true, 1499, 599.6, 674, 712, 749),
  ('SILVER_RETAIL_BOTTLE', 'Silver Retail (Bottle)', 'retail', 1, 0, false, 130, true, 4300, 430, 570, 665, 760),
  ('GOLD_RETAIL_BOTTLE', 'Gold Retail (Bottle)', 'retail', 3, 0, false, 140, true, 4300, 860, 950, 1045, 1140),
  ('PLATINUM_RETAIL_BOTTLE', 'Platinum Retail (Bottle)', 'retail', 11, 0, false, 150, true, 4300, 1720, 1710, 1805, 1900),
  ('SILVER_RETAIL_BLISTER', 'Silver Retail (Blister)', 'retail', 0, 1, true, 160, true, 1499, 599.6, 674, 712, 749),
  ('GOLD_RETAIL_BLISTER', 'Gold Retail (Blister)', 'retail', 0, 1, true, 170, true, 1499, 599.6, 674, 712, 749),
  ('PLATINUM_RETAIL_BLISTER', 'Platinum Retail (Blister)', 'retail', 0, 1, true, 180, true, 1499, 599.6, 674, 712, 749),
  ('CD_PLATINUM', 'CD Platinum (10 bottles)', 'cd', 10, 0, false, 190, true, 0, 0, 0, 0, 0),
  ('CD_GOLD', 'CD Gold (3 bottles)', 'cd', 3, 0, false, 200, true, 0, 0, 0, 0, 0),
  ('CD_SILVER', 'CD Silver (1 bottle)', 'cd', 1, 0, false, 210, true, 0, 0, 0, 0, 0)
on conflict (package_type) do update set
  label = coalesce(public.sku_prices.label, excluded.label),
  category = excluded.category,
  bottle_count = excluded.bottle_count,
  bundled_blister_count = excluded.bundled_blister_count,
  default_is_to_blister = excluded.default_is_to_blister,
  sort_order = excluded.sort_order,
  is_builtin = true;

-- New products (30 capsules = 1 bottle, 10 capsules = 1 blister).
insert into public.sku_prices (
  package_type, label, category, bottle_count, bundled_blister_count, default_is_to_blister,
  sort_order, is_builtin, original_price
) values
  ('START', 'Start (30-day)', 'protocol', 1, 0, false, 300, false, 3999),
  ('GROW', 'Grow (60-day)', 'protocol', 3, 0, false, 310, false, 10999),
  ('PEAK', 'Peak (90-day)', 'protocol', 11, 0, false, 320, false, 29999),
  ('TRIAL_BLISTER', 'Blister Trial', 'trial', 0, 1, true, 330, false, 1499),
  ('TRIAL_BOTTLE', 'Bottle Trial', 'trial', 1, 0, false, 340, false, 4299)
on conflict (package_type) do nothing;

alter table public.sku_prices
  alter column label set not null,
  add constraint sku_prices_package_type_format check (package_type ~ '^[A-Z0-9_]+$'),
  add constraint sku_prices_label_not_blank check (length(trim(label)) > 0);
