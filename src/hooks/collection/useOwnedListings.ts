"use client";

import { fetchMarketplaceAssetListings } from "@/lib/frontend/spl-browser-api";
import { listingsBySeller } from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import { useAsyncData } from "@/hooks/useAsyncData";

export interface OwnedListing {
  listingItemId: number;
  price: number;
  quantityRemaining: number;
}

const NO_LISTINGS: OwnedListing[] = [];

/** The account's own active listings for an asset (to show + cancel/delist). */
export function useOwnedListings(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const { data, loading, error, refetch } = useAsyncData(
    enabled && account && detailId ? `owned-listings:${account}:${assetName}:${detailId}` : null,
    async () => {
      const listings = await fetchMarketplaceAssetListings(assetName, detailId);
      return listingsBySeller(listings, account.trim().toLowerCase()).map((listing) => ({
        listingItemId: listing.listingItemId,
        price: listing.price,
        quantityRemaining: listing.quantityRemaining,
      }));
    },
    { errorMessage: "Failed to load your listings" }
  );
  return { listings: data ?? NO_LISTINGS, loading, error, refresh: refetch };
}
