"use client";

import { getLosingCardsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { BattleFilter, LosingCardStat } from "@/types/battles";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseLosingCardsReturn {
  cards: LosingCardStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLosingCards(filter: BattleFilter): UseLosingCardsReturn {
  const [cards, setCards] = useState<LosingCardStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchCards = useCallback(async () => {
    if (!filterRef.current.account) {
      setCards([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getLosingCardsAction(filterRef.current);
      setCards(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load losing data");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [
    filter.account,
    filter.formats,
    filter.cardTypes,
    filter.matchTypes,
    filter.rarities,
    filter.colors,
    filter.editions,
    filter.promoTiers,
    filter.rewardTiers,
    filter.extraTiers,
    filter.minManaCap,
    filter.maxManaCap,
    filter.rulesets,
    filter.groupLevels,
    filter.minBattleCount,
    fetchCards,
  ]);

  return { cards, loading, error, refetch: fetchCards };
}
