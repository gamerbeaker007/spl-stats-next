"use client";

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import {
  getFortuneWinnersAction,
  getTopFortuneWinnersAction,
} from "@/lib/backend/actions/jackpot-prizes/fortuneWinners";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { TopFortuneWinner } from "@/types/fortune/fortune";
import { FortuneType, FortuneWinner } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useFortuneWinners(initialPlayers: string[]) {
  const { user } = useAuth();
  const username = user?.username ?? null;

  const [players, setPlayers] = useState(initialPlayers);
  const [winners, setWinners] = useState<FortuneWinner[]>([]);
  const [topTenRanked, setTopTenRanked] = useState<TopFortuneWinner[]>([]);
  const [topTenFrontier, setTopTenFrontier] = useState<TopFortuneWinner[]>([]);
  // Separate flags so searching the winner list never hides the top-ten panels.
  const [searching, setSearching] = useState(false);
  const [topTenLoading, setTopTenLoading] = useState(true);

  const search = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      setWinners([]);
      return;
    }
    setSearching(true);
    try {
      const result = await getFortuneWinnersAction(accounts);
      setWinners(result);
    } finally {
      setSearching(false);
    }
  }, []);

  // Initial winner search for the server-provided monitored accounts.
  useEffect(() => {
    search(initialPlayers);
  }, [initialPlayers, search]);

  // The page is client-rendered, so a login/logout does not re-run the server
  // component that supplied `initialPlayers`. React to auth changes here: on
  // login, reset the search list to the freshly-loaded monitored accounts
  // (discarding any manually-added ones); on logout, clear it.
  const prevUsername = useRef<string | null>(username);
  useEffect(() => {
    if (prevUsername.current === username) return;
    prevUsername.current = username;

    let cancelled = false;
    async function resetToMonitored() {
      if (!username) {
        setPlayers([]);
        setWinners([]);
        return;
      }
      const accounts = (await getMonitoredAccounts()).map((a) => a.username);
      if (cancelled) return;
      setPlayers(accounts);
      search(accounts);
    }
    resetToMonitored();
    return () => {
      cancelled = true;
    };
  }, [username, search]);

  // Top-ten panels are global (not account-filtered) — fetch once on mount.
  useEffect(() => {
    let cancelled = false;

    async function fetchTopTen() {
      setTopTenLoading(true);
      try {
        const [ranked, frontier] = await Promise.all([
          getTopFortuneWinnersAction(FortuneType.RANKED),
          getTopFortuneWinnersAction(FortuneType.FRONTIER),
        ]);
        if (cancelled) return;
        setTopTenRanked(ranked);
        setTopTenFrontier(frontier);
      } catch (err) {
        console.error("Error fetching top ten fortune winners:", err);
      } finally {
        if (!cancelled) setTopTenLoading(false);
      }
    }

    fetchTopTen();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    players,
    setPlayers,
    winners,
    topTenRanked,
    topTenFrontier,
    searching,
    topTenLoading,
    search,
  };
}
