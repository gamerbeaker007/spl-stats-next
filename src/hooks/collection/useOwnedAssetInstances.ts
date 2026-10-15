"use client";

import { fetchInventory, fetchMarketplaceAssetListings } from "@/lib/frontend/spl-browser-api";
import { buildOwnedAssetInstances, listingsBySeller } from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetName, OwnedAssetInstance } from "@/types/marketplace-assets";
import { useAsyncData } from "@/hooks/useAsyncData";

const NO_INSTANCES: OwnedAssetInstance[] = [];

/**
 * Loads every owned copy of one asset (with per-copy listed status + listing id)
 * for the list/transfer copy pickers. Exposes `refresh` so a list/delist/transfer
 * can re-pull without closing the dialog.
 */
export function useOwnedAssetInstances(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const { data, loading, error, refetch } = useAsyncData(
    enabled && account && detailId ? `owned-instances:${account}:${assetName}:${detailId}` : null,
    async () => {
      const normalized = account.trim().toLowerCase();
      const [inventory, listings] = await Promise.all([
        fetchInventory(normalized),
        fetchMarketplaceAssetListings(assetName, detailId),
      ]);
      return buildOwnedAssetInstances(inventory, listingsBySeller(listings, normalized), detailId);
    },
    { errorMessage: "Failed to load your copies" }
  );
  return { instances: data ?? NO_INSTANCES, loading, error, refresh: refetch };
}
