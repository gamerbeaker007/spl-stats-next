"use client";

import {
  getLeaderboardHistoryAction,
  type LeaderboardSeasonPoint,
} from "@/lib/backend/actions/season-overview-actions";
import { useAsyncData } from "@/hooks/useAsyncData";

const EMPTY: LeaderboardSeasonPoint[] = [];

export function useLeaderboardHistory(username?: string) {
  const { data, loading, error } = useAsyncData(`leaderboard-history:${username ?? ""}`, () =>
    getLeaderboardHistoryAction(username)
  );
  return { data: data ?? EMPTY, loading, error };
}
