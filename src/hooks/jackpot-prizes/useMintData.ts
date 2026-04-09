"use client";

import { getMintHistoryAction } from "@/lib/backend/actions/jackpot-prizes/mintHistory";
import { useCallback, useState } from "react";
import { MintHistoryResponse } from "../../types/jackpot-prizes/shared";

interface MintDataState {
  [key: string]: MintHistoryResponse | null;
}

interface LoadingState {
  [key: string]: boolean;
}

export function useMintData() {
  const [mintData, setMintData] = useState<MintDataState>({});
  const [loading, setLoading] = useState<LoadingState>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const fetchMintData = useCallback(
    async (cardId: number, foil: number) => {
      const key = `${cardId}-${foil}`;
      // Don't fetch if already loading or already have data
      if (loading[key] || mintData[key]) {
        return;
      }

      setLoading((prev) => ({ ...prev, [key]: true }));
      setErrors((prev) => ({ ...prev, [key]: "" }));

      try {
        const data = await getMintHistoryAction(foil, cardId);
        setMintData((prev) => ({ ...prev, [key]: data }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error fetching mint data for foil ${foil}:`, errorMessage);
        setErrors((prev) => ({ ...prev, [key]: errorMessage }));
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [loading, mintData]
  );

  const getMintData = useCallback(
    (cardId: number, foil: number) => {
      return mintData[`${cardId}-${foil}`] ?? null;
    },
    [mintData]
  );

  const hasFoilData = useCallback(
    (cardId: number, foil: number) => {
      return !!mintData[`${cardId}-${foil}`];
    },
    [mintData]
  );

  const isLoading = useCallback(
    (cardId: number, foil: number) => {
      return !!loading[`${cardId}-${foil}`];
    },
    [loading]
  );

  const getError = useCallback(
    (cardId: number, foil: number) => {
      return errors[`${cardId}-${foil}`] || null;
    },
    [errors]
  );

  return {
    getMintData,
    fetchMintData,
    hasFoilData,
    isLoading,
    getError,
  };
}
