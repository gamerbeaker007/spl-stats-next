"use client";

import {
  getLeaderboardHistoryAction,
  type LeaderboardSeasonPoint,
} from "@/lib/backend/actions/season-overview-actions";
import { useCallback, useEffect, useState } from "react";

export function useLeaderboardHistory(username?: string) {
  const [data, setData] = useState<LeaderboardSeasonPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getLeaderboardHistoryAction(username);
      setData(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
