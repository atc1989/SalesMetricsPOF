import assert from 'node:assert/strict';
import {
  getDailySalesNetPrice,
  getDailySalesPackagePrice,
  mergeSkuPriceRows,
  normalizeDailySalesPackageType,
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

// SKU Management overrides: DB rows replace defaults, missing/unknown rows don't.
const overridden = mergeSkuPriceRows([
  {
    package_type: 'SILVER',
    original_price: '4400.00',
    distributor_discount: 0,
    stockist_discount: 60,
    city_stockist_discount: 180,
    center_discount: 240,
  },
  {
    package_type: 'NOT_A_SKU',
    original_price: 1,
    distributor_discount: 0,
    stockist_discount: 0,
    city_stockist_discount: 0,
    center_discount: 0,
  },
]);
assert.equal(getDailySalesPackagePrice('SILVER', overridden), 4400);
assert.equal(getDailySalesNetPrice('STOCKIST', 'SILVER', overridden), 4340);
assert.equal(getDailySalesNetPrice('NON-MEMBER', 'SILVER', overridden), 4400);
assert.equal(getDailySalesPackagePrice('GOLD', overridden), 13500);
assert.equal(getDailySalesPackagePrice('SILVER'), 4500, 'defaults must not be mutated');

console.log('All blister options use the correct member prices.');
