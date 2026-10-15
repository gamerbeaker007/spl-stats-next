"use client";

import {
  getSeasonEarningsSummaryAction,
  type EarningsSummaryPoint,
} from "@/lib/backend/actions/season-overview-actions";
import { useAsyncData } from "@/hooks/useAsyncData";

const EMPTY: EarningsSummaryPoint[] = [];

export function useSeasonEarnings(username?: string) {
  const { data, loading, error } = useAsyncData(`season-earnings:${username ?? ""}`, () =>
    getSeasonEarningsSummaryAction(username)
  );
  return { data: data ?? EMPTY, loading, error };
}
