-- Protocol and trial products from the official SKU list (30 capsules = 1 bottle, 10 capsules = 1 blister).
-- Run after 20261116000001_sku_catalog.sql. Safe to re-run: existing rows are updated, member discounts are kept.
insert into public.sku_prices (
  package_type, label, category, bottle_count, bundled_blister_count, default_is_to_blister,
  sort_order, is_active, is_builtin, original_price
) values
  ('START', 'Start (30 capsules)', 'protocol', 1, 0, false, 300, true, false, 4500),
  ('GROW', 'Grow (90 capsules)', 'protocol', 3, 0, false, 310, true, false, 13500),
  ('PEAK', 'Peak (330 capsules)', 'protocol', 11, 0, false, 320, true, false, 45000),
  ('TRIAL_BLISTER', 'Blister Trial (10 capsules)', 'trial', 0, 1, true, 330, true, false, 1499),
  ('TRIAL_BOTTLE', 'Bottle Trial (30 capsules)', 'trial', 1, 0, false, 340, true, false, 4200)
on conflict (package_type) do update set
  label = excluded.label,
  category = excluded.category,
  bottle_count = excluded.bottle_count,
  bundled_blister_count = excluded.bundled_blister_count,
  default_is_to_blister = excluded.default_is_to_blister,
  sort_order = excluded.sort_order,
  is_active = true,
  original_price = excluded.original_price,
  updated_at = now();
