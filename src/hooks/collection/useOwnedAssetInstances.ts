"use client";

import { getOwnedAssetInstancesAction } from "@/lib/backend/actions/marketplace-assets-actions";
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
        const next = await getOwnedAssetInstancesAction(account, assetName, detailId);
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
