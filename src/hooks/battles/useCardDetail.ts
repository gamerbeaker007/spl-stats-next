"use client";

import { getCardDetailAction } from "@/lib/backend/actions/battle-overview-actions";
import type { BattleFilter, CardDetailResult } from "@/types/battles";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCardDetailReturn {
  detail: CardDetailResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCardDetail(cardDetailId: number, filter: BattleFilter): UseCardDetailReturn {
  const [detail, setDetail] = useState<CardDetailResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchDetail = useCallback(async () => {
    if (!filterRef.current.account || !cardDetailId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getCardDetailAction(cardDetailId, filterRef.current);
      setDetail(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load card detail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [cardDetailId]);

  useEffect(() => {
    fetchDetail();
  }, [
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
    fetchDetail,
  ]);

  return { detail, loading, error, refetch: fetchDetail };
}
