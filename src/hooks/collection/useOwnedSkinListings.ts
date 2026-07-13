"use client";

import { getOwnedSkinListingsAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { useCallback, useEffect, useState } from "react";

export interface OwnedSkinListing {
  listingItemId: number;
  price: number;
  quantityRemaining: number;
}

/** The account's own active listings for a skin (to show + cancel/delist). */
export function useOwnedSkinListings(account: string, detailId: string, enabled: boolean) {
  const [listings, setListings] = useState<OwnedSkinListing[]>([]);
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
        const next = await getOwnedSkinListingsAction(account, detailId);
        if (active()) setListings(next);
      } catch (err) {
        if (active()) setError(err instanceof Error ? err.message : "Failed to load your listings");
      } finally {
        if (active()) setLoading(false);
      }
    },
    [account, detailId, enabled]
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
