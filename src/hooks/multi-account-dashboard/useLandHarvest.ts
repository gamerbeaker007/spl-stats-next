"use client";

import { useAccountAuthState } from "@/hooks/useAccountAuthState";
import { getPlayerLandHarvest } from "@/lib/backend/actions/player-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { toSectionAuthState, type SectionAuthState } from "@/lib/shared/authenticated-result";
import type { LandHarvestData } from "@/types/land/landHarvest";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseLandHarvestReturn {
  data: LandHarvestData | null;
  loading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  fetchLandHarvest: () => Promise<void>;
}

export function useLandHarvest(username: string): UseLandHarvestReturn {
  const [data, setData] = useState<LandHarvestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<SectionAuthState | null>(null);
  const isMountedRef = useRef(true);
  const { needsReAuth, expiryState, jwtExpiresAt } = useAccountAuthState(username);
  const { reAuthVersion } = useAuth();

  const fetchLandHarvest = useCallback(async () => {
    if (!username?.trim()) return;
    if (!isMountedRef.current) return;

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
      const result = await getPlayerLandHarvest(username);
      if (!isMountedRef.current) return;
      setAuthState(toSectionAuthState(result));
      if (result.status === "ok") {
        setData(result.data);
      } else {
        setData(null);
        setError(result.status === "error" ? result.message : null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch land harvest data");
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [username, needsReAuth, expiryState, jwtExpiresAt]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLandHarvest();
    return () => {
      isMountedRef.current = false;
    };
    // `reAuthVersion` re-runs this after a successful re-auth anywhere in the app.
  }, [fetchLandHarvest, reAuthVersion]);

  return { data, loading, error, authState, fetchLandHarvest };
}
