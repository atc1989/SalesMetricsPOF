'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildSkuCatalog,
  defaultSkuCatalog,
  type SkuCatalog,
  type SkuPriceRow,
} from '@/lib/dailySalesPackages';

async function fetchSkuCatalog(): Promise<SkuCatalog> {
  try {
    const response = await fetch('/api/daily-sales/sku-prices', { cache: 'no-store' });
    const json = (await response.json()) as { success?: boolean; rows?: SkuPriceRow[] };
    return json.success && json.rows ? buildSkuCatalog(json.rows) : defaultSkuCatalog;
  } catch {
    return defaultSkuCatalog;
  }
}

// Loads the SKU Management catalog; keeps the code defaults if the fetch fails.
export function useSkuCatalog() {
  const [state, setState] = useState<{ catalog: SkuCatalog; loaded: boolean }>({
    catalog: defaultSkuCatalog,
    loaded: false,
  });

  const reload = useCallback(async () => {
    const catalog = await fetchSkuCatalog();
    setState({ catalog, loaded: true });
    return catalog;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSkuCatalog().then((catalog) => {
      if (!cancelled) setState({ catalog, loaded: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, reload };
}
