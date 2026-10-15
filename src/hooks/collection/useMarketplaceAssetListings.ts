"use client";

import { fetchMarketplaceAssetListings } from "@/lib/frontend/spl-browser-api";
import type { MarketplaceAssetName, MarketplaceListingItem } from "@/types/marketplace-assets";
import { useAsyncData } from "@/hooks/useAsyncData";

const NO_LISTINGS: MarketplaceListingItem[] = [];

export function useMarketplaceAssetListings(
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const { data, loading, error, refetch } = useAsyncData(
    enabled && detailId ? `asset-listings:${assetName}:${detailId}` : null,
    () => fetchMarketplaceAssetListings(assetName, detailId),
    { errorMessage: "Failed to load listings" }
  );
  return { listings: data ?? NO_LISTINGS, loading, error, refresh: refetch };
}
