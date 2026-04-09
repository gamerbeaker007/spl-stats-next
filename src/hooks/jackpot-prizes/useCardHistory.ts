"use client";

import { getCardHistory } from "@/lib/backend/actions/jackpot-prizes/cardHistory";
import { useCallback, useState } from "react";
import { CardHistoryResponse } from "../../types/jackpot-prizes/cardHistory";

interface UseCardHistoryReturn {
  cardHistory: CardHistoryResponse | null;
  loading: boolean;
  error: string | null;
  fetchCardHistory: (cardId: string) => Promise<void>;
}

export function useCardHistory(): UseCardHistoryReturn {
  const [cardHistory, setCardHistory] = useState<CardHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCardHistory = useCallback(async (cardId: string) => {
    if (!cardId || !cardId.trim()) {
      setError("Invalid card ID provided");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCardHistory(cardId);

      // Check for API-level errors
      if (!Array.isArray(result)) {
        throw new Error("Invalid response format");
      }

      setCardHistory(result);
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
    fetchCardHistory,
  };
}
