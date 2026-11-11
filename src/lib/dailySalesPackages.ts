import type {
  EncoderBlisterOption,
  EncoderMemberTypeOption,
  EncoderPackageTypeOption,
} from '@/types/dailySales';

type DailySalesPackageDefinition = {
  label: string;
  originalPrice: number;
  bottleCount: number;
  bundledBlisterCount: number;
  defaultIsToBlister: EncoderBlisterOption;
};

export const dailySalesPackageCatalog: Record<
  EncoderPackageTypeOption,
  DailySalesPackageDefinition
> = {
  SILVER: {
    label: 'Silver (1 bottle)',
    originalPrice: 4500,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  GOLD: {
    label: 'Gold (3 bottles)',
    originalPrice: 13500,
    bottleCount: 3,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  PLATINUM: {
    label: 'Platinum (11 bottles)',
    originalPrice: 45000,
    bottleCount: 11,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  OLD_SILVER: {
    label: 'Old Silver (1 blister)',
    originalPrice: 1000,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  OLD_GOLD: {
    label: 'Old Gold (3 blisters)',
    originalPrice: 3000,
    bottleCount: 0,
    bundledBlisterCount: 3,
    defaultIsToBlister: '1',
  },
  OLD_PLATINUM: {
    label: 'Old Platinum (10 blisters)',
    originalPrice: 10000,
    bottleCount: 0,
    bundledBlisterCount: 10,
    defaultIsToBlister: '1',
  },
  USILVERGOLD: {
    label: 'USilverGold (2 bottles)',
    originalPrice: 9000,
    bottleCount: 2,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  UGOLDPLATINUM: {
    label: 'UGoldPlatinum (7 bottles)',
    originalPrice: 31500,
    bottleCount: 7,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  USILVERPLATINUM: {
    label: 'USilverPlatinum (9 bottles)',
    originalPrice: 40500,
    bottleCount: 9,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  RETAIL: {
    label: 'Retail (1 bottle)',
    originalPrice: 4300,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  RETAIL_MM: {
    label: 'Retail MM (1 bottle)',
    originalPrice: 4300,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  BLISTER: {
    label: 'Blister (1 blister pack)',
    originalPrice: 1499,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  SILVER_RETAIL_BOTTLE: {
    label: 'Silver Retail (Bottle)',
    originalPrice: 4300,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  GOLD_RETAIL_BOTTLE: {
    label: 'Gold Retail (Bottle)',
    originalPrice: 4300,
    bottleCount: 3,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  PLATINUM_RETAIL_BOTTLE: {
    label: 'Platinum Retail (Bottle)',
    originalPrice: 4300,
    bottleCount: 11,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  SILVER_RETAIL_BLISTER: {
    label: 'Silver Retail (Blister)',
    originalPrice: 1499,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  GOLD_RETAIL_BLISTER: {
    label: 'Gold Retail (Blister)',
    originalPrice: 1499,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  PLATINUM_RETAIL_BLISTER: {
    label: 'Platinum Retail (Blister)',
    originalPrice: 1499,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  CD_PLATINUM: {
    label: 'CD Platinum (10 bottles)',
    originalPrice: 0,
    bottleCount: 10,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  CD_GOLD: {
    label: 'CD Gold (3 bottles)',
    originalPrice: 0,
    bottleCount: 3,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  CD_SILVER: {
    label: 'CD Silver (1 bottle)',
    originalPrice: 0,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
};

export const encoderPackageOptions = (
  Object.entries(dailySalesPackageCatalog) as Array<
    [EncoderPackageTypeOption, DailySalesPackageDefinition]
  >
).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const dailySalesDiscountMatrix: Record<
  EncoderMemberTypeOption,
  Record<EncoderPackageTypeOption, number>
> = {
  DISTRIBUTOR: {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    OLD_SILVER: 0,
    OLD_GOLD: 0,
    OLD_PLATINUM: 0,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 1720,
    RETAIL_MM: 1720,
    BLISTER: 599.6,
    SILVER_RETAIL_BOTTLE: 430,
    GOLD_RETAIL_BOTTLE: 860,
    PLATINUM_RETAIL_BOTTLE: 1720,
    SILVER_RETAIL_BLISTER: 599.6,
    GOLD_RETAIL_BLISTER: 599.6,
    PLATINUM_RETAIL_BLISTER: 599.6,
    CD_PLATINUM: 0,
    CD_GOLD: 0,
    CD_SILVER: 0,
  },
  STOCKIST: {
    SILVER: 50,
    GOLD: 150,
    PLATINUM: 500,
    OLD_SILVER: 0,
    OLD_GOLD: 0,
    OLD_PLATINUM: 0,
    USILVERGOLD: 100,
    UGOLDPLATINUM: 350,
    USILVERPLATINUM: 450,
    RETAIL: 1935,
    RETAIL_MM: 2210,
    BLISTER: 674,
    SILVER_RETAIL_BOTTLE: 570,
    GOLD_RETAIL_BOTTLE: 950,
    PLATINUM_RETAIL_BOTTLE: 1710,
    SILVER_RETAIL_BLISTER: 674,
    GOLD_RETAIL_BLISTER: 674,
    PLATINUM_RETAIL_BLISTER: 674,
    CD_PLATINUM: 0,
    CD_GOLD: 0,
    CD_SILVER: 0,
  },
  'CITY STOCKIST': {
    SILVER: 180,
    GOLD: 540,
    PLATINUM: 1800,
    OLD_SILVER: 0,
    OLD_GOLD: 0,
    OLD_PLATINUM: 0,
    USILVERGOLD: 360,
    UGOLDPLATINUM: 1260,
    USILVERPLATINUM: 1620,
    RETAIL: 2042,
    RETAIL_MM: 2305,
    BLISTER: 712,
    SILVER_RETAIL_BOTTLE: 665,
    GOLD_RETAIL_BOTTLE: 1045,
    PLATINUM_RETAIL_BOTTLE: 1805,
    SILVER_RETAIL_BLISTER: 712,
    GOLD_RETAIL_BLISTER: 712,
    PLATINUM_RETAIL_BLISTER: 712,
    CD_PLATINUM: 0,
    CD_GOLD: 0,
    CD_SILVER: 0,
  },
  CENTER: {
    SILVER: 240,
    GOLD: 720,
    PLATINUM: 2400,
    OLD_SILVER: 0,
    OLD_GOLD: 0,
    OLD_PLATINUM: 0,
    USILVERGOLD: 480,
    UGOLDPLATINUM: 1680,
    USILVERPLATINUM: 2160,
    RETAIL: 2150,
    RETAIL_MM: 2400,
    BLISTER: 749,
    SILVER_RETAIL_BOTTLE: 760,
    GOLD_RETAIL_BOTTLE: 1140,
    PLATINUM_RETAIL_BOTTLE: 1900,
    SILVER_RETAIL_BLISTER: 749,
    GOLD_RETAIL_BLISTER: 749,
    PLATINUM_RETAIL_BLISTER: 749,
    CD_PLATINUM: 0,
    CD_GOLD: 0,
    CD_SILVER: 0,
  },
  'NON-MEMBER': {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    OLD_SILVER: 0,
    OLD_GOLD: 0,
    OLD_PLATINUM: 0,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 0,
    RETAIL_MM: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 0,
    GOLD_RETAIL_BOTTLE: 0,
    PLATINUM_RETAIL_BOTTLE: 0,
    SILVER_RETAIL_BLISTER: 0,
    GOLD_RETAIL_BLISTER: 0,
    PLATINUM_RETAIL_BLISTER: 0,
    CD_PLATINUM: 0,
    CD_GOLD: 0,
    CD_SILVER: 0,
  },
};

export type SkuPricing = {
  prices: Record<EncoderPackageTypeOption, number>;
  discounts: Record<EncoderMemberTypeOption, Record<EncoderPackageTypeOption, number>>;
};

// DB column per editable member tier in public.sku_prices; NON-MEMBER is always 0.
export const skuDiscountColumns = {
  DISTRIBUTOR: 'distributor_discount',
  STOCKIST: 'stockist_discount',
  'CITY STOCKIST': 'city_stockist_discount',
  CENTER: 'center_discount',
} as const;

export type SkuDiscountMemberType = keyof typeof skuDiscountColumns;

export type SkuPriceRow = {
  package_type: string;
  original_price: number | string;
} & Record<(typeof skuDiscountColumns)[SkuDiscountMemberType], number | string>;

export const defaultSkuPricing: SkuPricing = {
  prices: Object.fromEntries(
    Object.entries(dailySalesPackageCatalog).map(([type, config]) => [type, config.originalPrice]),
  ) as SkuPricing['prices'],
  discounts: dailySalesDiscountMatrix,
};

export function isEncoderPackageType(value: string): value is EncoderPackageTypeOption {
  return Object.hasOwn(dailySalesPackageCatalog, value);
}

// DB rows override the code defaults; package types without a row keep the defaults.
export function mergeSkuPriceRows(rows: SkuPriceRow[]): SkuPricing {
  const prices = { ...defaultSkuPricing.prices };
  const discounts = Object.fromEntries(
    Object.entries(dailySalesDiscountMatrix).map(([member, byPackage]) => [member, { ...byPackage }]),
  ) as SkuPricing['discounts'];

  for (const row of rows) {
    if (!isEncoderPackageType(row.package_type)) continue;
    prices[row.package_type] = Number(row.original_price);
    for (const [member, column] of Object.entries(skuDiscountColumns)) {
      discounts[member as SkuDiscountMemberType][row.package_type] = Number(row[column]);
    }
  }

  return { prices, discounts };
}

export function getDailySalesPackageConfig(packageType: EncoderPackageTypeOption) {
  return dailySalesPackageCatalog[packageType];
}

export function getDailySalesPackagePrice(
  packageType: EncoderPackageTypeOption,
  pricing: SkuPricing = defaultSkuPricing,
) {
  return pricing.prices[packageType];
}

export function getDailySalesPackageBottleCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
) {
  return Math.max(quantity, 0) * getDailySalesPackageConfig(packageType).bottleCount;
}

export function hasBundledPackageBlisters(packageType: EncoderPackageTypeOption) {
  return getDailySalesPackageConfig(packageType).bundledBlisterCount > 0;
}

export function getDailySalesPackageBlisterCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
  isToBlister: EncoderBlisterOption,
) {
  const normalizedQuantity = Math.max(quantity, 0);
  const config = getDailySalesPackageConfig(packageType);

  if (config.bundledBlisterCount > 0) {
    return normalizedQuantity * config.bundledBlisterCount;
  }

  return isToBlister === '1' ? normalizedQuantity * 10 : 0;
}

export function getDailySalesDiscount(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
  pricing: SkuPricing = defaultSkuPricing,
) {
  return pricing.discounts[memberType][packageType];
}

export function getDailySalesNetPrice(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
  pricing: SkuPricing = defaultSkuPricing,
) {
  return Math.max(
    getDailySalesPackagePrice(packageType, pricing) -
      getDailySalesDiscount(memberType, packageType, pricing),
    0,
  );
}

export function normalizeDailySalesPackageType(
  value: string,
): EncoderPackageTypeOption | null {
  const normalized = value.trim().toUpperCase();
  const hasOldPackageMarker =
    /(^|[\s_-])OLD([\s_-]|$)/.test(normalized) || /^OLD(SILVER|GOLD|PLATINUM)/.test(normalized);

  if (normalized.includes('PLATINUM') && normalized.includes('RETAIL') && normalized.includes('BLISTER')) {
    return 'PLATINUM_RETAIL_BLISTER';
  }

  if (hasOldPackageMarker && normalized.includes('PLATINUM')) {
    return 'OLD_PLATINUM';
  }

  if (hasOldPackageMarker && normalized.includes('GOLD')) {
    return 'OLD_GOLD';
  }

  if (hasOldPackageMarker && normalized.includes('SILVER')) {
    return 'OLD_SILVER';
  }

  if (normalized.includes('GOLD') && normalized.includes('RETAIL') && normalized.includes('BLISTER')) {
    return 'GOLD_RETAIL_BLISTER';
  }

  if (normalized.includes('SILVER') && normalized.includes('RETAIL') && normalized.includes('BLISTER')) {
    return 'SILVER_RETAIL_BLISTER';
  }

  if (normalized.includes('PLATINUM') && normalized.includes('RETAIL') && normalized.includes('BOTTLE')) {
    return 'PLATINUM_RETAIL_BOTTLE';
  }

  if (normalized.includes('GOLD') && normalized.includes('RETAIL') && normalized.includes('BOTTLE')) {
    return 'GOLD_RETAIL_BOTTLE';
  }

  if (normalized.includes('SILVER') && normalized.includes('RETAIL') && normalized.includes('BOTTLE')) {
    return 'SILVER_RETAIL_BOTTLE';
  }

  if (normalized.includes('USILVERPLATINUM')) {
    return 'USILVERPLATINUM';
  }

  if (normalized.includes('UGOLDPLATINUM')) {
    return 'UGOLDPLATINUM';
  }

  if (normalized.includes('USILVERGOLD')) {
    return 'USILVERGOLD';
  }

  if (normalized.includes('CD') && normalized.includes('PLATINUM')) {
    return 'CD_PLATINUM';
  }

  if (normalized.includes('CD') && normalized.includes('GOLD')) {
    return 'CD_GOLD';
  }

  if (normalized.includes('CD') && normalized.includes('SILVER')) {
    return 'CD_SILVER';
  }

  if (normalized.includes('PLATINUM')) {
    return 'PLATINUM';
  }

  if (normalized.includes('GOLD')) {
    return 'GOLD';
  }

  if (normalized.includes('SILVER')) {
    return 'SILVER';
  }

  if (normalized.includes('RETAIL') && normalized.includes('MM')) {
    return 'RETAIL_MM';
  }

  if (normalized === 'RETAIL' || normalized.includes('RETAIL')) {
    return 'RETAIL';
  }

  if (normalized === 'BLISTER' || normalized.includes('BLISTER')) {
    return 'BLISTER';
  }

  return null;
}
