"use client";

import { getMarketplaceAssetListingsAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { MarketplaceAssetName, MarketplaceListingItem } from "@/types/marketplace-assets";
import { useEffect, useState } from "react";

export function useMarketplaceAssetListings(
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !detailId) {
      setListings([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const next = await getMarketplaceAssetListingsAction(assetName, detailId);
        if (!active) return;
        setListings(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load listings");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [assetName, detailId, enabled]);

  return { listings, loading, error };
}
