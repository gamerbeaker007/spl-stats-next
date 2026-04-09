import { getSeasonBalanceSummary } from "@/lib/backend/actions/player-actions";
import { SeasonBalanceHistory } from "@/types/spl/balanceHistory";
import { useCallback, useState } from "react";

export type TokenFetchStatus = "pending" | "fetching" | "done" | "error";

export interface TokenProgress {
  token: string;
  status: TokenFetchStatus;
  errorMessage?: string;
}

interface UseBalanceHistoryState {
  isLoading: boolean;
  error: string | null;
  balanceHistory: SeasonBalanceHistory | null;
  progress: TokenProgress[];
}

interface UseBalanceHistoryReturn extends UseBalanceHistoryState {
  fetchBalanceHistory: (username: string, seasonId: number) => Promise<void>;
  clearBalanceHistory: () => void;
  clearError: () => void;
}

const emptyState: UseBalanceHistoryState = {
  isLoading: false,
  error: null,
  balanceHistory: null,
  progress: [],
};

export function useBalanceHistory(): UseBalanceHistoryReturn {
  const [state, setState] = useState<UseBalanceHistoryState>(emptyState);

  const fetchBalanceHistory = useCallback(async (username: string, seasonId: number) => {
    setState({ ...emptyState, isLoading: true });

    try {
      const balanceHistory = await getSeasonBalanceSummary(username, seasonId);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        balanceHistory,
        progress: balanceHistory.summaries.map((s) => ({
          token: s.token,
          status: "done" as TokenFetchStatus,
        })),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  }, []);

  const clearBalanceHistory = useCallback(() => {
    setState(emptyState);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchBalanceHistory,
    clearBalanceHistory,
    clearError,
  };
}
