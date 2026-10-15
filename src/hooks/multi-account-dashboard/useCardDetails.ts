"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getCardDetails } from "@/lib/backend/actions/player-actions";
import { SplCardDetail } from "@/types/spl/cardDetails";

interface UseCardDetailsReturn {
  cardDetails: SplCardDetail[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCardDetailsOptions {
  autoFetch?: boolean;
}

const NO_CARDS: SplCardDetail[] = [];

async function loadCardDetails(): Promise<SplCardDetail[]> {
  try {
    return await getCardDetails();
  } catch (err) {
    console.error("Card data fetch error:", err);
    throw err;
  }
}

export function useCardDetails(options: UseCardDetailsOptions = {}): UseCardDetailsReturn {
  const { autoFetch = true } = options;
  const { data, loading, error, refetch } = useAsyncData(
    autoFetch ? "card-details" : null,
    loadCardDetails,
    { errorMessage: "Failed to fetch data" }
  );

  return {
    cardDetails: data ?? NO_CARDS,
    loading,
    error,
    refetch,
  };
}
