"use client";

import { getMarketplaceAssetListingsAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { MarketplaceAssetName, MarketplaceListingItem } from "@/types/marketplace-assets";
import { useCallback, useEffect, useState } from "react";

export function useMarketplaceAssetListings(
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: () => boolean): Promise<MarketplaceListingItem[]> => {
      if (!enabled || !detailId) {
        setListings([]);
        setLoading(false);
        setError(null);
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const next = await getMarketplaceAssetListingsAction(assetName, detailId);
        if (active()) setListings(next);
        return next;
      } catch (err) {
        if (active()) setError(err instanceof Error ? err.message : "Failed to load listings");
        return [];
      } finally {
        if (active()) setLoading(false);
      }
    },
    [assetName, detailId, enabled]
  );

  useEffect(() => {
    if (!enabled || !detailId) {
      setListings([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    load(() => active);

    return () => {
      active = false;
    };
  }, [detailId, enabled, load]);

  const refresh = useCallback(() => load(() => true), [load]);

  return { listings, loading, error, refresh };
}
