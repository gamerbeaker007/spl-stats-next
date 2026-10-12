"use client";

import {
  getLandMarketAction,
  refreshLandMarketAction,
} from "@/lib/backend/actions/land-market-actions";
import { LAND_MARKET_STALE_SECONDS } from "@/lib/shared/land-market";
import type { LandMarketData, LandMarketListing } from "@/types/land/landMarket";
import { useCallback, useEffect, useState } from "react";

const STALE_MS = LAND_MARKET_STALE_SECONDS * 1000;
const EMPTY: LandMarketListing[] = [];

/**
 * Module-level client cache: survives remounts (leaving and returning to the
 * page, switching views) so the ~2.5k listings are only re-downloaded once stale.
 */
let cached: { data: LandMarketData; loadedAt: number } | null = null;
let inflight: Promise<LandMarketData> | null = null;

function isStale(): boolean {
  return !cached || Date.now() - cached.loadedAt > STALE_MS;
}

function request(manual: boolean): Promise<LandMarketData> {
  // Share one request between concurrent callers (mount + focus, double clicks).
  if (inflight && !manual) return inflight;
  const pending = (manual ? refreshLandMarketAction() : getLandMarketAction())
    .then((data) => {
      cached = { data, loadedAt: Date.now() };
      return data;
    })
    .finally(() => {
      if (inflight === pending) inflight = null;
    });
  inflight = pending;
  return pending;
}

/**
 * Land marketplace listings. Filters, sorting, paging and view switches work on
 * the cached list and never refetch. When the data goes stale (60s) it is
 * refreshed in the background on mount / window focus while the current
 * listings stay visible (`refreshing`), and `refresh()` forces a reload.
 */
export function useLandMarket() {
  const [data, setData] = useState<LandMarketData | null>(() => cached?.data ?? null);
  const [loading, setLoading] = useState(() => cached === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual: boolean) => {
    if (cached) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setData(await request(manual));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load land listings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshIfStale = () => {
      if (isStale()) void load(false);
    };
    refreshIfStale();

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    listings: data?.listings ?? EMPTY,
    fetchedAt: data?.fetchedAt ?? null,
    loading,
    refreshing,
    error,
    refresh,
  };
}
