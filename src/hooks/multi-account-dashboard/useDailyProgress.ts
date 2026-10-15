"use client";

import { useAuthenticatedData } from "@/hooks/useAuthenticatedData";
import { getPlayersDailyProgress } from "@/lib/backend/actions/player-actions";
import type { SectionAuthState } from "@/lib/shared/authenticated-result";
import { DailyProgressData } from "@/types/playerDailyProgress";

interface UseDailyProgressReturn {
  data: DailyProgressData | null;
  loading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  fetchDailyProgress: () => Promise<void>;
}

export const useDailyProgress = (
  username: string,
  options?: { enabled?: boolean }
): UseDailyProgressReturn => {
  const { refetch, ...rest } = useAuthenticatedData(
    "daily-progress",
    username,
    getPlayersDailyProgress,
    { enabled: options?.enabled, errorMessage: "Unknown error occurred" }
  );
  return { ...rest, fetchDailyProgress: refetch };
};
