"use client";

import { getOwnedListingsAction } from "@/lib/backend/actions/marketplace-assets-actions";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import { useCallback, useEffect, useState } from "react";

export interface OwnedListing {
  listingItemId: number;
  price: number;
  quantityRemaining: number;
}

/** The account's own active listings for an asset (to show + cancel/delist). */
export function useOwnedListings(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string,
  enabled: boolean
) {
  const [listings, setListings] = useState<OwnedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: () => boolean) => {
      if (!enabled || !account || !detailId) {
        setListings([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const next = await getOwnedListingsAction(account, assetName, detailId);
        if (active()) setListings(next);
      } catch (err) {
        if (active()) setError(err instanceof Error ? err.message : "Failed to load your listings");
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

  return { listings, loading, error, refresh };
}
