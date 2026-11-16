import type {
  BuiltinPackageType,
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

// Built-in SKUs: seed values and fallback when public.sku_prices is unavailable.
export const dailySalesPackageCatalog: Record<
  BuiltinPackageType,
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

export const dailySalesDiscountMatrix: Record<
  EncoderMemberTypeOption,
  Record<BuiltinPackageType, number>
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

const memberTypes = Object.keys(dailySalesDiscountMatrix) as EncoderMemberTypeOption[];

// DB column per editable member tier in public.sku_prices; NON-MEMBER is always 0.
export const skuDiscountColumns = {
  DISTRIBUTOR: 'distributor_discount',
  STOCKIST: 'stockist_discount',
  'CITY STOCKIST': 'city_stockist_discount',
  CENTER: 'center_discount',
} as const;

export type SkuDiscountMemberType = keyof typeof skuDiscountColumns;

export const skuCategories = ['package', 'retail', 'cd', 'protocol', 'trial'] as const;

export type SkuProduct = {
  type: EncoderPackageTypeOption;
  label: string;
  category: string;
  price: number;
  bottleCount: number;
  bundledBlisterCount: number;
  defaultIsToBlister: EncoderBlisterOption;
  discounts: Record<EncoderMemberTypeOption, number>;
  isActive: boolean;
  isBuiltin: boolean;
  sortOrder: number;
};

export type SkuCatalog = {
  products: SkuProduct[];
  byType: Record<string, SkuProduct>;
};

// Row shape of public.sku_prices; catalog columns are optional so older rows still parse.
export type SkuPriceRow = {
  package_type: string;
  original_price: number | string;
  label?: string | null;
  category?: string | null;
  bottle_count?: number | string | null;
  bundled_blister_count?: number | string | null;
  default_is_to_blister?: boolean | null;
  sort_order?: number | string | null;
  is_active?: boolean | null;
  is_builtin?: boolean | null;
} & Record<(typeof skuDiscountColumns)[SkuDiscountMemberType], number | string>;

function builtinCategory(type: BuiltinPackageType) {
  if (type.startsWith('CD_')) return 'cd';
  if (type.includes('RETAIL') || type === 'BLISTER') return 'retail';
  return 'package';
}

function buildCatalog(products: SkuProduct[]): SkuCatalog {
  const sorted = [...products].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.type.localeCompare(b.type),
  );
  return { products: sorted, byType: Object.fromEntries(sorted.map((p) => [p.type, p])) };
}

export const defaultSkuCatalog: SkuCatalog = buildCatalog(
  (Object.entries(dailySalesPackageCatalog) as Array<[BuiltinPackageType, DailySalesPackageDefinition]>).map(
    ([type, config], index) => ({
      type,
      label: config.label,
      category: builtinCategory(type),
      price: config.originalPrice,
      bottleCount: config.bottleCount,
      bundledBlisterCount: config.bundledBlisterCount,
      defaultIsToBlister: config.defaultIsToBlister,
      discounts: Object.fromEntries(
        memberTypes.map((member) => [member, dailySalesDiscountMatrix[member][type]]),
      ) as SkuProduct['discounts'],
      isActive: true,
      isBuiltin: true,
      sortOrder: (index + 1) * 10,
    }),
  ),
);

const skuIdPattern = /^[A-Z0-9_]+$/;

export function isValidSkuId(value: string) {
  return skuIdPattern.test(value);
}

// e.g. "trial-blister" becomes "TRIAL_BLISTER"
export function toSkuId(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

const toNumber = (value: unknown, fallback: number) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// DB rows override or add to the code defaults; built-ins without a row keep the defaults.
export function buildSkuCatalog(rows: SkuPriceRow[]): SkuCatalog {
  const byType: Record<string, SkuProduct> = Object.fromEntries(
    defaultSkuCatalog.products.map((product) => [
      product.type,
      { ...product, discounts: { ...product.discounts } },
    ]),
  );

  for (const row of rows) {
    if (!isValidSkuId(row.package_type)) continue;
    const base = byType[row.package_type];
    const discounts = { ...(base?.discounts ?? {}) } as SkuProduct['discounts'];
    for (const [member, column] of Object.entries(skuDiscountColumns)) {
      discounts[member as SkuDiscountMemberType] = toNumber(row[column], 0);
    }
    discounts['NON-MEMBER'] = 0;

    byType[row.package_type] = {
      type: row.package_type,
      label: row.label?.trim() || base?.label || row.package_type,
      category: row.category?.trim() || base?.category || 'package',
      price: toNumber(row.original_price, base?.price ?? 0),
      bottleCount: toNumber(row.bottle_count, base?.bottleCount ?? 0),
      bundledBlisterCount: toNumber(row.bundled_blister_count, base?.bundledBlisterCount ?? 0),
      defaultIsToBlister:
        row.default_is_to_blister == null
          ? (base?.defaultIsToBlister ?? '0')
          : row.default_is_to_blister
            ? '1'
            : '0',
      discounts,
      isActive: row.is_active ?? true,
      isBuiltin: base?.isBuiltin ?? false,
      sortOrder: toNumber(row.sort_order, base?.sortOrder ?? 1000),
    };
  }

  return buildCatalog(Object.values(byType));
}

// Encoder dropdown: active products, plus the current selection if it was archived.
export function getEncoderPackageOptions(catalog: SkuCatalog = defaultSkuCatalog, current?: string) {
  return catalog.products
    .filter((product) => product.isActive || product.type === current)
    .map((product) => ({ value: product.type, label: product.label }));
}

const unknownProduct = (type: string): SkuProduct => ({
  type,
  label: type,
  category: 'package',
  price: 0,
  bottleCount: 0,
  bundledBlisterCount: 0,
  defaultIsToBlister: '0',
  discounts: Object.fromEntries(memberTypes.map((member) => [member, 0])) as SkuProduct['discounts'],
  isActive: false,
  isBuiltin: false,
  sortOrder: Number.MAX_SAFE_INTEGER,
});

export function getDailySalesPackageConfig(
  packageType: EncoderPackageTypeOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return catalog.byType[packageType] ?? unknownProduct(packageType);
}

export function getDailySalesPackagePrice(
  packageType: EncoderPackageTypeOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return getDailySalesPackageConfig(packageType, catalog).price;
}

export function getDailySalesPackageBottleCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return Math.max(quantity, 0) * getDailySalesPackageConfig(packageType, catalog).bottleCount;
}

export function hasBundledPackageBlisters(
  packageType: EncoderPackageTypeOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return getDailySalesPackageConfig(packageType, catalog).bundledBlisterCount > 0;
}

export function getDailySalesPackageBlisterCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
  isToBlister: EncoderBlisterOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  const normalizedQuantity = Math.max(quantity, 0);
  const config = getDailySalesPackageConfig(packageType, catalog);

  if (config.bundledBlisterCount > 0) {
    return normalizedQuantity * config.bundledBlisterCount;
  }

  return isToBlister === '1' ? normalizedQuantity * 10 : 0;
}

export function getDailySalesDiscount(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return getDailySalesPackageConfig(packageType, catalog).discounts[memberType] ?? 0;
}

export function getDailySalesNetPrice(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
  catalog: SkuCatalog = defaultSkuCatalog,
) {
  return Math.max(
    getDailySalesPackagePrice(packageType, catalog) -
      getDailySalesDiscount(memberType, packageType, catalog),
    0,
  );
}

// Exact SKU IDs (built-in or added in SKU Management) win; legacy free-text labels fall back to keyword rules.
export function normalizeDailySalesPackageType(
  value: string,
  catalog: SkuCatalog = defaultSkuCatalog,
): EncoderPackageTypeOption | null {
  const skuId = toSkuId(value);
  if (catalog.byType[skuId]) {
    return skuId;
  }

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
