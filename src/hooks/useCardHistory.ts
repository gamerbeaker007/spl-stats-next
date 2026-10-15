"use client";

import { fetchCardHistory as fetchCardHistoryInBrowser } from "@/lib/frontend/spl-browser-api";
import { useCallback, useState } from "react";
import { CardHistoryResponse } from "@/types/jackpot-prizes/cardHistory";

interface UseCardHistoryReturn {
  cardHistory: CardHistoryResponse | null;
  loading: boolean;
  error: string | null;
  checkedAt: number | null;
  fetchCardHistory: (cardId: string) => Promise<void>;
}

/**
 * Card uid history, read from SPL in the browser (jackpot detail pane and the
 * collection history dialog) — a click-driven lookup that costs the server nothing.
 */
export function useCardHistory(): UseCardHistoryReturn {
  const [cardHistory, setCardHistory] = useState<CardHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const fetchCardHistory = useCallback(async (cardId: string) => {
    if (!cardId || !cardId.trim()) {
      setError("Invalid card ID provided");
      return;
    }

    setLoading(true);
    setError(null);
    setCardHistory(null);
    setCheckedAt(null);

    try {
      const result = await fetchCardHistoryInBrowser(cardId);

      // Check for API-level errors
      if (!Array.isArray(result)) {
        throw new Error("Invalid response format");
      }

      setCardHistory(result);
      setCheckedAt(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch card history";
      setError(errorMessage);
      console.error("Card history fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cardHistory,
    loading,
    error,
    checkedAt,
    fetchCardHistory,
  };
}
