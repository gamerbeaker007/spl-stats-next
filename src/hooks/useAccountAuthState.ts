"use client";

import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { getTokenExpiryState, type TokenExpiryState } from "@/lib/shared/token-utils";
import { useMemo } from "react";

export interface AccountAuthState {
  /** False until the monitored accounts (and their token state) have loaded. */
  known: boolean;
  /** True when an authenticated SPL call cannot succeed until the user re-auths. */
  needsReAuth: boolean;
  expiryState: TokenExpiryState;
  jwtExpiresAt: Date | null;
}

/**
 * Client-side SPL token state for one monitored account, derived from
 * `AccountsContext` — no server round trip.
 *
 * Deliberately expressed through `getTokenExpiryState` so it applies the same
 * "valid status but expiry in the past ⇒ invalid" rule as the server-side
 * `getAccountTokenStatus` and cannot drift from it.
 *
 * A hook that has this can skip an authenticated fetch entirely instead of
 * letting it 401 — the server-side gate (`resolveUsableJwt`) stays the authority.
 */
export function useAccountAuthState(username: string): AccountAuthState {
  const { monitoredAccountTokens } = useAccounts();
  const normalized = username.trim().toLowerCase();

  return useMemo(() => {
    const entry = monitoredAccountTokens[normalized];
    if (!entry) {
      // Unknown account (or not loaded yet): let the server decide.
      return { known: false, needsReAuth: false, expiryState: "unknown", jwtExpiresAt: null };
    }

    const expiryState = getTokenExpiryState(entry.jwtExpiresAt);
    // `tokenStatus === "unknown"` is the DB default for an account the worker has
    // not verified yet, so it must NOT gate calls — only a token known to be bad
    // ("invalid") or demonstrably expired does.
    return {
      known: true,
      needsReAuth: entry.tokenStatus === "invalid" || expiryState === "expired",
      expiryState,
      jwtExpiresAt: entry.jwtExpiresAt,
    };
  }, [monitoredAccountTokens, normalized]);
}
