"use client";

import { getMintHistoryAction } from "@/lib/backend/actions/jackpot-prizes/mintHistory";
import { useCallback, useRef, useState } from "react";
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
  // Keys fetched (or being fetched) once. Also covers failures, so an error doesn't
  // trigger a refetch loop; this keeps fetchMintData stable for effect deps.
  const requestedRef = useRef(new Set<string>());

  const fetchMintData = useCallback(async (cardId: number, foil: number) => {
    const key = `${cardId}-${foil}`;
    if (requestedRef.current.has(key)) return;
    requestedRef.current.add(key);

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
  }, []);

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
