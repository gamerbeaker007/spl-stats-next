"use client";

import {
  getCardWatchesAction,
  unwatchCardAction,
  watchCardAction,
} from "@/lib/backend/actions/card-watch-actions";
import { loadMarketPrices } from "@/lib/frontend/collection-data";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";
import { useCallback, useEffect, useState } from "react";

function toMap(list: CardWatch[]): Record<string, CardWatch> {
  return Object.fromEntries(list.map((w) => [`${w.cardDetailId}-${w.edition}-${w.foil}`, w]));
}

const NO_WATCHES: Record<string, CardWatch> = {};

/** The logged-in user's watched card + edition + foil combinations. */
export function useCardWatches(enabled: boolean) {
  const [watches, setWatches] = useState<Record<string, CardWatch>>({});

  const reload = useCallback(
    () => getCardWatchesAction().then((list) => setWatches(toMap(list))),
    []
  );

  useEffect(() => {
    if (!enabled) return;
    getCardWatchesAction().then((list) => setWatches(toMap(list)));
  }, [enabled]);

  /**
   * `marketPrices` is the price map the page already has (from SPL in the browser);
   * when the page hasn't loaded prices, the grouped market is fetched once here.
   * The snapshot is the user's own reference point, so trusting the client is fine.
   */
  const toggleWatch = useCallback(
    async (
      cardDetailId: number,
      edition: number,
      foil: number,
      marketPrices?: Record<string, MarketPriceInfo>
    ) => {
      const key = `${cardDetailId}-${edition}-${foil}`;
      const watched = Boolean(watches[key]);
      let price: MarketPriceInfo | undefined;
      if (!watched) {
        try {
          price = (marketPrices ?? (await loadMarketPrices()).prices)[key];
        } catch {
          // No price available: the watch is still saved, with a 0 snapshot.
        }
      }
      // Optimistic; the reload below restores the saved state.
      setWatches((current) => {
        const next = { ...current };
        if (watched) delete next[key];
        else
          next[key] = {
            cardDetailId,
            edition,
            foil,
            lowPriceBcxAtWatch: price?.lowPriceBcx ?? 0,
            lowPriceAtWatch: price?.lowPrice ?? 0,
            watchedAt: new Date(),
          };
        return next;
      });
      try {
        if (watched) await unwatchCardAction(cardDetailId, edition, foil);
        else
          await watchCardAction(
            cardDetailId,
            edition,
            foil,
            price?.lowPriceBcx ?? 0,
            price?.lowPrice ?? 0
          );
      } catch {
        // Reload below restores the server state, undoing the optimistic update.
      }
      await reload();
    },
    [watches, reload]
  );

  // Hide stale watches after logout without clearing state in an effect.
  return { watches: enabled ? watches : NO_WATCHES, toggleWatch };
}
