"use client";

import { useAccountAuthState } from "@/hooks/useAccountAuthState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import {
  toSectionAuthState,
  type AuthenticatedResult,
  type SectionAuthState,
} from "@/lib/shared/authenticated-result";
import { useMemo } from "react";

export interface UseAuthenticatedDataReturn<T> {
  data: T | null;
  loading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  refetch: () => Promise<void>;
}

/**
 * Loads a JWT-dependent section for one account. Skips the round trip when the
 * token is known-dead client-side, and reloads after a re-auth anywhere in the app.
 */
export function useAuthenticatedData<T>(
  name: string,
  username: string,
  loader: (username: string) => Promise<AuthenticatedResult<T>>,
  options: { enabled?: boolean; errorMessage: string }
): UseAuthenticatedDataReturn<T> {
  const enabled = (options.enabled ?? true) && Boolean(username?.trim());
  const { needsReAuth, expiryState, jwtExpiresAt } = useAccountAuthState(username);
  const { reAuthVersion } = useAuth();

  const key = enabled && !needsReAuth ? `${name}:${username}:${reAuthVersion}` : null;
  const {
    data: result,
    loading,
    error: thrown,
    refetch,
  } = useAsyncData(key, () => loader(username), { errorMessage: options.errorMessage });

  const authState = useMemo<SectionAuthState | null>(() => {
    if (!enabled) return null;
    if (needsReAuth) {
      return {
        needsReAuth: true,
        reason: expiryState === "expired" ? "token_expired" : "no_token",
        jwtExpiresAt,
      };
    }
    return result ? toSectionAuthState(result) : null;
  }, [enabled, needsReAuth, expiryState, jwtExpiresAt, result]);

  const active = key !== null;
  return {
    data: active && !thrown && result?.status === "ok" ? result.data : null,
    loading,
    error: active ? (thrown ?? (result?.status === "error" ? result.message : null)) : null,
    authState,
    refetch,
  };
}
