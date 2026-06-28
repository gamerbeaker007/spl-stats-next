import { findFortuneWinners, getTopTenFortuneWinners } from "@/lib/backend/db/fotruneWinner";
import { FortuneType, FortuneWinner } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

export function useFortuneWinners(initialPlayers: string[]) {
  const [players, setPlayers] = useState(initialPlayers);
  const [winners, setWinners] = useState<FortuneWinner[]>([]);
  const [topTenRanked, setTopTenRanked] = useState<{ player: string; count: number }[]>([]);
  const [topTenFrontier, setTopTenFrontier] = useState<{ player: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (accounts: string[]) => {
    setLoading(true);

    try {
      const result = await findFortuneWinners(accounts);
      setWinners(result);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch top ten ranked and frontier winners on mount
  useEffect(() => {
    const fetchTopTenRanked = async () => {
      try {
        const result = await getTopTenFortuneWinners(FortuneType.RANKED);
        setTopTenRanked(result);
      } catch (err) {
        console.error("Error fetching top ten ranked fortune winners:", err);
      }
    };

    const fetchTopTenFrontier = async () => {
      try {
        const result = await getTopTenFortuneWinners(FortuneType.FRONTIER);
        setTopTenFrontier(result);
      } catch (err) {
        console.error("Error fetching top ten frontier fortune winners:", err);
      }
    };

    fetchTopTenRanked();
    fetchTopTenFrontier();
  }, []);

  return {
    players,
    setPlayers,
    winners,
    topTenRanked,
    topTenFrontier,
    loading,
    search,
  };
}
