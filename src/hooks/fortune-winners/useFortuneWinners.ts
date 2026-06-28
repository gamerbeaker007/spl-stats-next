import { findFortuneWinners } from "@/lib/backend/actions/jackpot-prizes/fortuneWinners";
import { FortuneWinner } from "@prisma/client";
import { useCallback, useState } from "react";

export function useFortuneWinners(initialPlayers: string[]) {
  const [players, setPlayers] = useState(initialPlayers);
  const [winners, setWinners] = useState<FortuneWinner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const search = useCallback(async (accounts: string[]) => {
    setLoading(true);

    try {
      const result = await findFortuneWinners(accounts);
      setPlayers(accounts);
      setWinners(result);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    players,
    winners,
    loading,
    error,
    search,
  };
}
