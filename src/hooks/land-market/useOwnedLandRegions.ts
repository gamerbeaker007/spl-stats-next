"use client";

import { getOwnedLandRegionsAction } from "@/lib/backend/actions/land-market-actions";
import { LAND_OWNED_STALE_SECONDS } from "@/lib/shared/land-market";
import type { LandOwnedRegion } from "@/types/land/landMarket";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STALE_MS = LAND_OWNED_STALE_SECONDS * 1000;

/** Per-account client cache — one account's regions are never reused for another. */
const cache = new Map<string, { regions: LandOwnedRegion[]; loadedAt: number }>();

interface State {
  account: string;
  regions: LandOwnedRegion[] | null;
  error: string | null;
}

function initialState(account: string): State {
  const hit = cache.get(account);
  return { account, regions: hit?.regions ?? null, error: null };
}

/**
 * Regions the selected account owns plots in, as a `region_uid` lookup set
 * (the owned-land API keys regions by uid, e.g. `PR-CEF-81`). Cached per
 * account for 5 minutes. `refreshVersion` bumps (after a purchase) force a
 * fresh read so a newly bought region shows up.
 */
export function useOwnedLandRegions(account: string | null, refreshVersion = 0) {
  const normalized = (account ?? "").trim().toLowerCase();
  const [state, setState] = useState<State>(() => initialState(normalized));

  // Reset synchronously when the account changes so the previous account's
  // regions are never shown, even for one render.
  if (state.account !== normalized) {
    setState(initialState(normalized));
  }

  // Results are only applied once the request settles, inside promise callbacks,
  // and only if the account is still selected; a background refresh keeps the
  // cached regions visible meanwhile.
  const request = useCallback((target: string, fresh: boolean) => {
    getOwnedLandRegionsAction(target, fresh).then(
      (regions) => {
        cache.set(target, { regions, loadedAt: Date.now() });
        setState((prev) =>
          prev.account === target ? { account: target, regions, error: null } : prev
        );
      },
      (err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load owned land";
        setState((prev) => (prev.account === target ? { ...prev, error: message } : prev));
      }
    );
  }, []);

  useEffect(() => {
    if (!normalized) return;
    const hit = cache.get(normalized);
    if (!hit || Date.now() - hit.loadedAt > STALE_MS) request(normalized, false);
  }, [normalized, request]);

  // Only a version bump after mount forces a fresh read; account changes go
  // through the effect above.
  const lastRefreshVersion = useRef(refreshVersion);
  useEffect(() => {
    if (refreshVersion === lastRefreshVersion.current) return;
    lastRefreshVersion.current = refreshVersion;
    if (normalized) request(normalized, true);
  }, [normalized, refreshVersion, request]);

  const retry = useCallback(() => {
    if (!normalized) return;
    // Clear the error first so the toggle shows loading again while retrying.
    setState((prev) => ({ ...prev, error: null }));
    request(normalized, false);
  }, [normalized, request]);

  const regionUids = useMemo(
    () => new Set((state.regions ?? []).map((region) => region.regionUid)),
    [state.regions]
  );

  return {
    regionUids,
    regionCount: state.regions?.length ?? 0,
    loaded: state.regions !== null,
    loading: normalized !== "" && state.regions === null && !state.error,
    error: state.error,
    retry,
  };
}
