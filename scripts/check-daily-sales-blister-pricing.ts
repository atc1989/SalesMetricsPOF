import assert from 'node:assert/strict';
import {
  getDailySalesNetPrice,
  getDailySalesPackagePrice,
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

console.log('All blister options use the correct member prices.');
