"use client";

import { getMarketplaceAssetsPageDataAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { DetailedPlayerCardCollection } from "@/types/card";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetName,
} from "@/types/marketplace-assets";
import { useCallback, useEffect, useState } from "react";

export interface MarketplaceAssetsPageData {
  account: string;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  detailedCollection: DetailedPlayerCardCollection;
}

export function useMarketplaceAssetsPageData(
  account: string,
  assetName: MarketplaceAssetName,
  refreshVersion = 0
) {
  const [data, setData] = useState<MarketplaceAssetsPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: () => boolean): Promise<MarketplaceAssetsPageData | null> => {
      if (!account) {
        setData(null);
        setLoading(false);
        setError(null);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const next = await getMarketplaceAssetsPageDataAction(account, assetName);
        if (active()) setData(next);
        return next;
      } catch (err) {
        if (active())
          setError(err instanceof Error ? err.message : "Failed to load marketplace data");
        return null;
      } finally {
        if (active()) setLoading(false);
      }
    },
    [account, assetName]
  );

  useEffect(() => {
    if (!account) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    load(() => active);

    return () => {
      active = false;
    };
  }, [account, load, refreshVersion]);

  const refresh = useCallback(() => load(() => true), [load]);

  return { data, loading, error, refresh };
}
