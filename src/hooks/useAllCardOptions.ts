"use client";

import { getCardNamesAction } from "@/lib/backend/actions/card-stats/cardStatsAction";
import type { CardOption } from "@/types/card";
import { useEffect, useState } from "react";

// Every card in the game, shared across mounts: several filter drawers can be on
// screen during a session, and the list only changes when a new set releases.
let allCardOptionsPromise: Promise<CardOption[]> | null = null;

function loadAllCardOptions(): Promise<CardOption[]> {
  allCardOptionsPromise ??= getCardNamesAction().catch((error: unknown) => {
    allCardOptionsPromise = null; // allow a retry on the next mount
    throw error;
  });
  return allCardOptionsPromise;
}

export function useAllCardOptions(): { cards: CardOption[]; loading: boolean } {
  const [cards, setCards] = useState<CardOption[]>([]);
  // Start in the loading state so the autocomplete never flashes "No options".
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadAllCardOptions()
      .then((result) => {
        if (!cancelled) setCards(result);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cards, loading };
}
