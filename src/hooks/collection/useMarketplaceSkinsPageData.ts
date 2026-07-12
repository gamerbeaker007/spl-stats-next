"use client";

import { getMarketplaceSkinsPageDataAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { MarketplaceSkinGroup, MarketplaceSkinItem } from "@/types/marketplace-assets";
import type { DetailedPlayerCardCollection } from "@/types/card";
import { useEffect, useState } from "react";

export interface MarketplaceSkinsPageData {
  account: string;
  skins: MarketplaceSkinItem[];
  groups: MarketplaceSkinGroup[];
  detailedCollection: DetailedPlayerCardCollection;
}

export function useMarketplaceSkinsPageData(account: string, refreshVersion = 0) {
  const [data, setData] = useState<MarketplaceSkinsPageData | null>(null);
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
        const next = await getMarketplaceSkinsPageDataAction(account);
        if (!active) return;
        setData(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load marketplace skins");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [account, refreshVersion]);

  return { data, loading, error };
}
