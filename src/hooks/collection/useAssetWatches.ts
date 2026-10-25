"use client";

import {
  getAssetWatchesAction,
  unwatchAssetAction,
  watchAssetAction,
} from "@/lib/backend/actions/asset-watch-actions";
import type { AssetWatch } from "@/types/asset-watch";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import { useCallback, useEffect, useState } from "react";

const NO_WATCHES: Record<string, AssetWatch> = {};

function toMap(list: AssetWatch[]): Record<string, AssetWatch> {
  return Object.fromEntries(list.map((watch) => [watch.detailId, watch]));
}

/** The logged-in user's watched items for one non-card marketplace asset type. */
export function useAssetWatches(assetName: MarketplaceAssetName, enabled: boolean) {
  const [watches, setWatches] = useState<Record<string, AssetWatch>>({});

  const reload = useCallback(
    () => getAssetWatchesAction(assetName).then((list) => setWatches(toMap(list))),
    [assetName]
  );

  useEffect(() => {
    if (!enabled) return;
    getAssetWatchesAction(assetName).then((list) => setWatches(toMap(list)));
  }, [assetName, enabled]);

  const toggleWatch = useCallback(
    async (detailId: string, currentPriceUsd: number | undefined) => {
      const watched = Boolean(watches[detailId]);
      const price = currentPriceUsd && Number.isFinite(currentPriceUsd) ? currentPriceUsd : 0;
      setWatches((current) => {
        const next = { ...current };
        if (watched) delete next[detailId];
        else next[detailId] = { assetName, detailId, priceAtWatch: price, watchedAt: new Date() };
        return next;
      });
      try {
        if (watched) await unwatchAssetAction(assetName, detailId);
        else await watchAssetAction(assetName, detailId, price);
      } catch {
        // The reload below restores the saved state, undoing the optimistic update.
      }
      await reload();
    },
    [assetName, reload, watches]
  );

  return { watches: enabled ? watches : NO_WATCHES, toggleWatch };
}
