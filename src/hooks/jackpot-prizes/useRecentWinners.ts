"use client";

import { getRecentWinnersAction } from "@/lib/backend/actions/jackpot-prizes/mintHistory";
import { useEffect, useState } from "react";
import { RecentWinner } from "../../types/jackpot-prizes/shared";

export function useRecentWinners(edition: number | undefined) {
  const [result, setResult] = useState<{
    winners: RecentWinner[];
    edition: number | undefined;
    fetchedAt: string | null;
  }>({ winners: [], edition: undefined, fetchedAt: null });

  useEffect(() => {
    if (edition === undefined) return;
    getRecentWinnersAction(edition)
      .then(({ data, fetchedAt }) => setResult({ winners: data, edition, fetchedAt }))
      .catch((error: unknown) => {
        console.error("Failed to fetch recent jackpot winners:", error);
        setResult({ winners: [], edition, fetchedAt: null });
      });
  }, [edition]);

  const winners = edition === undefined || result.edition !== edition ? [] : result.winners;
  const loading = edition !== undefined && result.edition !== edition;

  const fetchedAt = edition === undefined || result.edition !== edition ? null : result.fetchedAt;
  return { winners, loading, fetchedAt };
}
