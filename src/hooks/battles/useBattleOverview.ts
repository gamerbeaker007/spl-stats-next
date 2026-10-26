"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getBestCardsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { BestCardStat } from "@/types/battles";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseBattleOverviewReturn {
  cards: BestCardStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const NO_CARDS: BestCardStat[] = [];

export function useBattleOverview(filter: UnifiedCardFilter): UseBattleOverviewReturn {
  // Only the filter fields the query uses — other fields change without a refetch.
  const key = filter.account
    ? `battle-overview:${JSON.stringify([
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
        filter.betaOrbPromo,
        filter.minManaCap,
        filter.maxManaCap,
        filter.rulesets,
        filter.groupLevels,
        filter.groupFoils,
        filter.cardName,
        filter.selectedCardDetailIds,
        filter.minBattleCount,
        filter.sortBy,
        filter.sinceDays,
        filter.foilCategories,
      ])}`
    : null;
  const { data, loading, error, refetch } = useAsyncData(key, () => getBestCardsAction(filter), {
    errorMessage: "Failed to load battle data",
  });
  return { cards: data ?? NO_CARDS, loading, error, refetch };
}
