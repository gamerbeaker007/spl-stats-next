"use client";

import { fetchInventory, fetchMarketplaceAssetListings } from "@/lib/frontend/spl-browser-api";
import { buildOwnedAssetInstances, listingsBySeller } from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetName, OwnedAssetInstance } from "@/types/marketplace-assets";
import { useCallback, useEffect, useState } from "react";

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
  const [instances, setInstances] = useState<OwnedAssetInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: () => boolean) => {
      if (!enabled || !account || !detailId) {
        setInstances([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const normalized = account.trim().toLowerCase();
        const [inventory, listings] = await Promise.all([
          fetchInventory(normalized),
          fetchMarketplaceAssetListings(assetName, detailId),
        ]);
        const next = buildOwnedAssetInstances(
          inventory,
          listingsBySeller(listings, normalized),
          detailId
        );
        if (active()) setInstances(next);
      } catch (err) {
        if (active()) setError(err instanceof Error ? err.message : "Failed to load your copies");
      } finally {
        if (active()) setLoading(false);
      }
    },
    [account, assetName, detailId, enabled]
  );

  useEffect(() => {
    let isActive = true;
    load(() => isActive);
    return () => {
      isActive = false;
    };
  }, [load]);

  const refresh = useCallback(() => load(() => true), [load]);

  return { instances, loading, error, refresh };
}
