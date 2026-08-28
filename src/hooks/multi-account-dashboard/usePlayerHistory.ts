"use client";

import { getPlayerSeasonHistory } from "@/lib/backend/actions/player-actions";
import { toSectionAuthState, type SectionAuthState } from "@/lib/shared/authenticated-result";
import { ParsedPlayerRewardHistory } from "@/types/parsedHistory";
import { useCallback, useState } from "react";

interface UsePlayerHistoryState {
  isLoading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  rewardHistory: ParsedPlayerRewardHistory | null;
}

interface UsePlayerHistoryReturn extends UsePlayerHistoryState {
  fetchHistory: (player: string, seasonId: number) => Promise<void>;
  clearHistory: () => void;
  clearError: () => void;
}

export function usePlayerHistory(): UsePlayerHistoryReturn {
  const [state, setState] = useState<UsePlayerHistoryState>({
    isLoading: false,
    error: null,
    authState: null,
    rewardHistory: null,
  });

  const fetchHistory = useCallback(async (player: string, seasonId: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, authState: null }));

    try {
      const result = await getPlayerSeasonHistory(player, seasonId);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        // A missing season row now arrives as `error`, no longer conflated with
        // "not authenticated".
        error: result.status === "error" ? result.message : null,
        authState: toSectionAuthState(result),
        rewardHistory: result.status === "ok" ? result.data : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  }, []);

  const clearHistory = useCallback(() => {
    setState({ isLoading: false, rewardHistory: null, error: null, authState: null });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, authState: null }));
  }, []);

  return {
    ...state,
    fetchHistory,
    clearHistory,
    clearError,
  };
}
