"use client";

import { getMarketplaceAssetsPageDataAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { DetailedPlayerCardCollection } from "@/types/card";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetName,
} from "@/types/marketplace-assets";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!account) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await getMarketplaceAssetsPageDataAction(account, assetName);
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load marketplace data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [account, assetName, refreshVersion]);

  return { data, loading, error };
}
