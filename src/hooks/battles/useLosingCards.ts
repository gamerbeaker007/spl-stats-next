"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getLosingCardsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { LosingCardStat } from "@/types/battles";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseLosingCardsReturn {
  cards: LosingCardStat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const NO_CARDS: LosingCardStat[] = [];

export function useLosingCards(filter: UnifiedCardFilter): UseLosingCardsReturn {
  // Only the filter fields the query uses — other fields change without a refetch.
  const key = filter.account
    ? `losing-cards:${JSON.stringify([
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
        filter.sinceDays,
      ])}`
    : null;
  const { data, loading, error, refetch } = useAsyncData(key, () => getLosingCardsAction(filter), {
    errorMessage: "Failed to load losing data",
  });
  return { cards: data ?? NO_CARDS, loading, error, refetch };
}
