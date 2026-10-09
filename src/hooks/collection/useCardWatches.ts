"use client";

import {
  getCardWatchesAction,
  unwatchCardAction,
  watchCardAction,
} from "@/lib/backend/actions/card-watch-actions";
import type { CardWatch } from "@/types/card-watch";
import { useCallback, useEffect, useState } from "react";

function toMap(list: CardWatch[]): Record<string, CardWatch> {
  return Object.fromEntries(list.map((w) => [`${w.cardDetailId}-${w.foil}`, w]));
}

const NO_WATCHES: Record<string, CardWatch> = {};

/** The logged-in user's watched card + foil combinations, keyed by `${cardDetailId}-${foilInt}`. */
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

  const toggleWatch = useCallback(
    async (cardDetailId: number, foil: number) => {
      const key = `${cardDetailId}-${foil}`;
      const watched = Boolean(watches[key]);
      // Optimistic; the reload below brings in the server-side price snapshot.
      setWatches((current) => {
        const next = { ...current };
        if (watched) delete next[key];
        else
          next[key] = {
            cardDetailId,
            foil,
            lowPriceBcxAtWatch: 0,
            lowPriceAtWatch: 0,
            watchedAt: new Date(),
          };
        return next;
      });
      try {
        if (watched) await unwatchCardAction(cardDetailId, foil);
        else await watchCardAction(cardDetailId, foil);
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
