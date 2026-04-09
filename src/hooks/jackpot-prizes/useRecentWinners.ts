"use client";

import { getRecentWinnersAction } from "@/lib/backend/actions/jackpot-prizes/mintHistory";
import { useEffect, useState } from "react";
import { RecentWinner } from "../../types/jackpot-prizes/shared";

export function useRecentWinners(edition: number | undefined) {
  const [result, setResult] = useState<{ winners: RecentWinner[]; edition: number | undefined }>({
    winners: [],
    edition: undefined,
  });

  useEffect(() => {
    if (edition === undefined) return;
    getRecentWinnersAction(edition)
      .then((winners) => setResult({ winners, edition }))
      .catch(() => setResult({ winners: [], edition }));
  }, [edition]);

  const winners = edition === undefined || result.edition !== edition ? [] : result.winners;
  const loading = edition !== undefined && result.edition !== edition;

  return { winners, loading };
}
