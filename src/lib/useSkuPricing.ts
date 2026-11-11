'use client';

import { useEffect, useState } from 'react';
import {
  defaultSkuPricing,
  mergeSkuPriceRows,
  type SkuPricing,
  type SkuPriceRow,
} from '@/lib/dailySalesPackages';

// Loads SKU Management prices once; keeps the code defaults if the fetch fails.
export function useSkuPricing() {
  const [state, setState] = useState<{ pricing: SkuPricing; loaded: boolean }>({
    pricing: defaultSkuPricing,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/daily-sales/sku-prices', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json: { success?: boolean; rows?: SkuPriceRow[] }) => {
        if (cancelled) return;
        setState({
          pricing: json.success && json.rows ? mergeSkuPriceRows(json.rows) : defaultSkuPricing,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ pricing: defaultSkuPricing, loaded: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
