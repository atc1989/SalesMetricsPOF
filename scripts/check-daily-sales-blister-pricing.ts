import assert from 'node:assert/strict';
import {
  buildSkuCatalog,
  getDailySalesNetPrice,
  getDailySalesPackageBlisterCount,
  getDailySalesPackageBottleCount,
  getDailySalesPackagePrice,
  getEncoderPackageOptions,
  normalizeDailySalesPackageType,
  type SkuPriceRow,
} from '../src/lib/dailySalesPackages';
import type { EncoderMemberTypeOption } from '../src/types/dailySales';

const expectedPrices: Array<[EncoderMemberTypeOption, number]> = [
  ['DISTRIBUTOR', 899.4],
  ['STOCKIST', 825],
  ['CITY STOCKIST', 787],
  ['CENTER', 750],
  ['NON-MEMBER', 1499],
];

for (const label of [
  'Blister (1 blister pack)',
  'Silver Retail (Blister)',
  'Gold Retail (Blister)',
  'Platinum Retail (Blister)',
]) {
  const packageType = normalizeDailySalesPackageType(label);
  assert.ok(packageType, label);
  assert.equal(getDailySalesPackagePrice(packageType), 1499, label);
  for (const [memberType, expectedPrice] of expectedPrices) {
    assert.equal(getDailySalesNetPrice(memberType, packageType), expectedPrice, `${label}: ${memberType}`);
  }
}

const discounts = { distributor_discount: 0, stockist_discount: 0, city_stockist_discount: 0, center_discount: 0 };

// SKU Management overrides: DB rows replace defaults; invalid IDs are ignored.
const overridden = buildSkuCatalog([
  {
    package_type: 'SILVER',
    original_price: '4400.00',
    distributor_discount: 0,
    stockist_discount: 60,
    city_stockist_discount: 180,
    center_discount: 240,
  },
  { package_type: 'not a sku', original_price: 1, ...discounts },
]);
assert.equal(getDailySalesPackagePrice('SILVER', overridden), 4400);
assert.equal(getDailySalesNetPrice('STOCKIST', 'SILVER', overridden), 4340);
assert.equal(getDailySalesNetPrice('NON-MEMBER', 'SILVER', overridden), 4400);
assert.equal(getDailySalesPackagePrice('GOLD', overridden), 13500);
assert.equal(getDailySalesPackagePrice('SILVER'), 4500, 'defaults must not be mutated');
assert.equal(getDailySalesPackageBottleCount('SILVER', 2, overridden), 2, 'old rows without counts keep defaults');

// Products added in SKU Management.
const newProducts: SkuPriceRow[] = [
  { package_type: 'START', label: 'Start (30-day)', original_price: 3999, bottle_count: 1, bundled_blister_count: 0, sort_order: 300, ...discounts },
  { package_type: 'PEAK', label: 'Peak (90-day)', original_price: 29999, bottle_count: 11, bundled_blister_count: 0, sort_order: 320, ...discounts },
  { package_type: 'TRIAL_BLISTER', label: 'Blister Trial', original_price: 1499, bottle_count: 0, bundled_blister_count: 1, default_is_to_blister: true, sort_order: 330, ...discounts },
  { package_type: 'OLD_GOLD', original_price: 3000, is_active: false, ...discounts },
];
const catalog = buildSkuCatalog(newProducts);

assert.equal(normalizeDailySalesPackageType('TRIAL_BLISTER', catalog), 'TRIAL_BLISTER');
assert.equal(normalizeDailySalesPackageType('trial-blister', catalog), 'TRIAL_BLISTER');
assert.equal(normalizeDailySalesPackageType('Blister (1 blister pack)', catalog), 'BLISTER');
assert.equal(normalizeDailySalesPackageType('start', catalog), 'START');
assert.equal(getDailySalesPackagePrice('PEAK', catalog), 29999);
assert.equal(getDailySalesPackageBottleCount('START', 3, catalog), 3);
assert.equal(getDailySalesPackageBottleCount('PEAK', 1, catalog), 11);
assert.equal(getDailySalesPackageBlisterCount('TRIAL_BLISTER', 2, '1', catalog), 2);
assert.equal(getDailySalesNetPrice('DISTRIBUTOR', 'PEAK', catalog), 29999);
assert.equal(getDailySalesPackagePrice('UNKNOWN_SKU', catalog), 0, 'unknown SKUs do not crash');

const options = getEncoderPackageOptions(catalog).map((option) => option.value);
assert.ok(options.includes('PEAK'));
assert.ok(!options.includes('OLD_GOLD'), 'archived SKUs are hidden from the encoder');
assert.ok(getEncoderPackageOptions(catalog, 'OLD_GOLD').some((option) => option.value === 'OLD_GOLD'), 'current archived selection stays');
assert.ok(options.indexOf('SILVER') < options.indexOf('START'), 'sorted by sort_order');

console.log('SKU catalog checks passed.');
