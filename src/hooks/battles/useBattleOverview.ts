"use client";

import { getBestCardsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { BestCardStat } from "@/types/battles";
import { useCallback, useEffect, useRef, useState } from "react";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseBattleOverviewReturn {
  cards: BestCardStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBattleOverview(filter: UnifiedCardFilter): UseBattleOverviewReturn {
  const [cards, setCards] = useState<BestCardStat[]>([]);
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
      const result = await getBestCardsAction(filterRef.current);
      setCards(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load battle data");
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
    filter.groupFoils,
    filter.cardName,
    filter.minBattleCount,
    filter.sortBy,
    filter.sinceDays,
    filter.foilCategories,
    fetchCards,
  ]);

  return { cards, loading, error, refetch: fetchCards };
}
