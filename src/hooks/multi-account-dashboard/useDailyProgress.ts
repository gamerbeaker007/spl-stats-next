"use client";

import { useAccountAuthState } from "@/hooks/useAccountAuthState";
import { getPlayersDailyProgress } from "@/lib/backend/actions/player-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { toSectionAuthState, type SectionAuthState } from "@/lib/shared/authenticated-result";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { useCallback, useEffect, useState } from "react";

interface UseDailyProgressReturn {
  data: DailyProgressData | null;
  loading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  fetchDailyProgress: () => Promise<void>;
}

export const useDailyProgress = (username: string): UseDailyProgressReturn => {
  const [data, setData] = useState<DailyProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<SectionAuthState | null>(null);
  const { needsReAuth, expiryState, jwtExpiresAt } = useAccountAuthState(username);
  const { reAuthVersion } = useAuth();

  const fetchDailyProgress = useCallback(async () => {
    // The token is known-dead client-side: skip the round trip entirely.
    if (needsReAuth) {
      setData(null);
      setError(null);
      setAuthState({
        needsReAuth: true,
        reason: expiryState === "expired" ? "token_expired" : "no_token",
        jwtExpiresAt,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getPlayersDailyProgress(username);
      setAuthState(toSectionAuthState(result));
      if (result.status === "ok") {
        setData(result.data);
      } else {
        setData(null);
        setError(result.status === "error" ? result.message : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, needsReAuth, expiryState, jwtExpiresAt]);

  useEffect(() => {
    fetchDailyProgress();
    // `reAuthVersion` re-runs this after a successful re-auth anywhere in the app.
  }, [fetchDailyProgress, reAuthVersion]);

  return { data, loading, error, authState, fetchDailyProgress };
};
