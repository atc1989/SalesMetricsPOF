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
    label: 'Silver (1 bottle + 1 blister)',
    originalPrice: 4500,
    bottleCount: 1,
    bundledBlisterCount: 1,
    defaultIsToBlister: '0',
  },
  GOLD: {
    label: 'Gold (3 bottles + 3 blisters)',
    originalPrice: 13500,
    bottleCount: 3,
    bundledBlisterCount: 3,
    defaultIsToBlister: '0',
  },
  PLATINUM: {
    label: 'Platinum (10 bottles + 10 blisters)',
    originalPrice: 45000,
    bottleCount: 10,
    bundledBlisterCount: 10,
    defaultIsToBlister: '0',
  },
  USILVERGOLD: {
    label: 'USilverGold (2 bottles + 2 blisters)',
    originalPrice: 9000,
    bottleCount: 2,
    bundledBlisterCount: 2,
    defaultIsToBlister: '0',
  },
  UGOLDPLATINUM: {
    label: 'UGoldPlatinum (7 bottles + 7 blisters)',
    originalPrice: 31500,
    bottleCount: 7,
    bundledBlisterCount: 7,
    defaultIsToBlister: '0',
  },
  USILVERPLATINUM: {
    label: 'USilverPlatinum (9 bottles + 9 blisters)',
    originalPrice: 40500,
    bottleCount: 9,
    bundledBlisterCount: 9,
    defaultIsToBlister: '0',
  },
  RETAIL: {
    label: 'Retail (1 bottle)',
    originalPrice: 3800,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  BLISTER: {
    label: 'Blister (1 blister pack)',
    originalPrice: 1299,
    bottleCount: 0,
    bundledBlisterCount: 0,
    defaultIsToBlister: '1',
  },
  SILVER_RETAIL_BOTTLE: {
    label: 'Silver Retail (Bottle)',
    originalPrice: 3800,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  GOLD_RETAIL_BOTTLE: {
    label: 'Gold Retail (Bottle)',
    originalPrice: 3800,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  PLATINUM_RETAIL_BOTTLE: {
    label: 'Platinum Retail (Bottle)',
    originalPrice: 3800,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: '0',
  },
  SILVER_RETAIL_BLISTER: {
    label: 'Silver Retail (Blister)',
    originalPrice: 1299,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  GOLD_RETAIL_BLISTER: {
    label: 'Gold Retail (Blister)',
    originalPrice: 1299,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
  },
  PLATINUM_RETAIL_BLISTER: {
    label: 'Platinum Retail (Blister)',
    originalPrice: 1299,
    bottleCount: 0,
    bundledBlisterCount: 1,
    defaultIsToBlister: '1',
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
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 380,
    GOLD_RETAIL_BOTTLE: 760,
    PLATINUM_RETAIL_BOTTLE: 1520,
    SILVER_RETAIL_BLISTER: 130,
    GOLD_RETAIL_BLISTER: 260,
    PLATINUM_RETAIL_BLISTER: 520,
  },
  STOCKIST: {
    SILVER: 50,
    GOLD: 150,
    PLATINUM: 500,
    USILVERGOLD: 100,
    UGOLDPLATINUM: 350,
    USILVERPLATINUM: 450,
    RETAIL: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 570,
    GOLD_RETAIL_BOTTLE: 950,
    PLATINUM_RETAIL_BOTTLE: 1710,
    SILVER_RETAIL_BLISTER: 195,
    GOLD_RETAIL_BLISTER: 325,
    PLATINUM_RETAIL_BLISTER: 585,
  },
  'CITY STOCKIST': {
    SILVER: 180,
    GOLD: 540,
    PLATINUM: 1800,
    USILVERGOLD: 360,
    UGOLDPLATINUM: 1260,
    USILVERPLATINUM: 1620,
    RETAIL: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 665,
    GOLD_RETAIL_BOTTLE: 1045,
    PLATINUM_RETAIL_BOTTLE: 1805,
    SILVER_RETAIL_BLISTER: 227,
    GOLD_RETAIL_BLISTER: 357,
    PLATINUM_RETAIL_BLISTER: 617,
  },
  CENTER: {
    SILVER: 240,
    GOLD: 720,
    PLATINUM: 2400,
    USILVERGOLD: 480,
    UGOLDPLATINUM: 1680,
    USILVERPLATINUM: 2160,
    RETAIL: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 760,
    GOLD_RETAIL_BOTTLE: 1140,
    PLATINUM_RETAIL_BOTTLE: 1900,
    SILVER_RETAIL_BLISTER: 260,
    GOLD_RETAIL_BLISTER: 390,
    PLATINUM_RETAIL_BLISTER: 649,
  },
  'NON-MEMBER': {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 0,
    BLISTER: 0,
    SILVER_RETAIL_BOTTLE: 0,
    GOLD_RETAIL_BOTTLE: 0,
    PLATINUM_RETAIL_BOTTLE: 0,
    SILVER_RETAIL_BLISTER: 0,
    GOLD_RETAIL_BLISTER: 0,
    PLATINUM_RETAIL_BLISTER: 0,
  },
};

export function getDailySalesPackageConfig(packageType: EncoderPackageTypeOption) {
  return dailySalesPackageCatalog[packageType];
}

export function getDailySalesPackagePrice(packageType: EncoderPackageTypeOption) {
  return getDailySalesPackageConfig(packageType).originalPrice;
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
) {
  return dailySalesDiscountMatrix[memberType][packageType];
}

export function getDailySalesNetPrice(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
) {
  return Math.max(
    getDailySalesPackagePrice(packageType) - getDailySalesDiscount(memberType, packageType),
    0,
  );
}

export function normalizeDailySalesPackageType(
  value: string,
): EncoderPackageTypeOption | null {
  const normalized = value.trim().toUpperCase();

  if (normalized.includes('PLATINUM') && normalized.includes('RETAIL') && normalized.includes('BLISTER')) {
    return 'PLATINUM_RETAIL_BLISTER';
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

  if (normalized.includes('PLATINUM')) {
    return 'PLATINUM';
  }

  if (normalized.includes('GOLD')) {
    return 'GOLD';
  }

  if (normalized.includes('SILVER')) {
    return 'SILVER';
  }

  if (normalized === 'RETAIL' || normalized.includes('RETAIL')) {
    return 'RETAIL';
  }

  if (normalized === 'BLISTER' || normalized.includes('BLISTER')) {
    return 'BLISTER';
  }

  return null;
}
