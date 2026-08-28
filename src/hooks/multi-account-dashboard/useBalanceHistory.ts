import { getSeasonBalanceSummary } from "@/lib/backend/actions/player-actions";
import { SeasonBalanceHistory } from "@/types/spl/balanceHistory";
import { useCallback, useRef, useState } from "react";

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
  const latestRequestId = useRef(0);

  const fetchBalanceHistory = useCallback(async (username: string, seasonId: number) => {
    const requestId = ++latestRequestId.current;

    // Preserve the currently displayed chart during the refresh.
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: null,
    }));

    try {
      const balanceHistory = await getSeasonBalanceSummary(username, seasonId);

      // A newer selection was made while this request was pending.
      if (requestId !== latestRequestId.current) return;

      setState({
        isLoading: false,
        error: null,
        balanceHistory,
        progress: balanceHistory.summaries.map((summary) => ({
          token: summary.token,
          status: "done",
        })),
      });
    } catch (error) {
      if (requestId !== latestRequestId.current) return;

      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  }, []);

  const clearBalanceHistory = useCallback(() => {
    // Ensure an already-running request cannot restore cleared data.
    latestRequestId.current += 1;
    setState(emptyState);
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
    }));
  }, []);

  return {
    ...state,
    fetchBalanceHistory,
    clearBalanceHistory,
    clearError,
  };
}
