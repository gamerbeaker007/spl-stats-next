"use client";

import { getCardNamesAction } from "@/lib/backend/actions/card-stats/cardStatsAction";
import type { CardOption } from "@/types/card";
import { useCallback, useEffect, useState } from "react";

export function useAllCardOptions(): { cards: CardOption[]; loading: boolean } {
  const [cards, setCards] = useState<CardOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCardNamesAction();
      setCards(result);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading };
}
