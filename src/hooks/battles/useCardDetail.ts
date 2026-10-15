"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getCardDetailAction } from "@/lib/backend/actions/battle-overview-actions";
import type { CardDetailResult } from "@/types/battles";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseCardDetailReturn {
  detail: CardDetailResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCardDetail(
  cardDetailId: number,
  filter: UnifiedCardFilter
): UseCardDetailReturn {
  // Only the filter fields the query uses — other fields change without a refetch.
  const key =
    filter.account && cardDetailId
      ? `card-detail:${JSON.stringify([
          cardDetailId,
          filter.account,
          filter.formats,
          filter.matchTypes,
          filter.minManaCap,
          filter.maxManaCap,
          filter.rulesets,
          filter.groupLevels,
          filter.groupFoils,
          filter.sinceDays,
        ])}`
      : null;
  const { data, loading, error, refetch } = useAsyncData(
    key,
    () => getCardDetailAction(cardDetailId, filter),
    { errorMessage: "Failed to load card detail" }
  );
  return { detail: data ?? null, loading, error, refetch };
}
