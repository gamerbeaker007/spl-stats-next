import { getPlayersDailyProgress } from "@/lib/backend/actions/player-actions";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { useCallback, useEffect, useState } from "react";

interface UseDailyProgressReturn {
  data: DailyProgressData | null;
  loading: boolean;
  error: string | null;
  fetchDailyProgress: () => Promise<void>;
}

export const useDailyProgress = (username: string): UseDailyProgressReturn => {
  const [data, setData] = useState<DailyProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDailyProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const responseData = await getPlayersDailyProgress(username);
      if (!responseData) {
        setError("Not authenticated — log in to show daily progress");
        setData(null);
      } else {
        setData(responseData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchDailyProgress();
  }, [fetchDailyProgress]);

  return {
    data,
    loading,
    error,
    fetchDailyProgress,
  };
};
