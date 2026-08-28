import { decryptToken } from "@/lib/backend/auth/encryption";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";
import type { ReAuthReason } from "@/lib/shared/authenticated-result";
import { getTokenExpiryState } from "@/lib/shared/token-utils";

/**
 * Resolve and decrypt the stored SPL JWT for a monitored account.
 *
 * Server-only. Callers are responsible for the authorization check
 * (`assertMonitorsAccount`) before using the returned token.
 *
 * NOTE: performs **no** expiry check on purpose. This is called from inside the
 * `"use cache"` bodies in `cache/spl-authenticated-cache.ts`, where returning
 * `undefined` for an unusable token would persist an "unauthenticated" result in
 * the cache for the whole cache window. Gate with `resolveUsableJwt` in the
 * calling Server Action instead; the cached bodies throw when the token is gone.
 */
export async function getDecryptedJwt(username: string): Promise<string | undefined> {
  const creds = await getSplAccountCredentials(username);
  if (!creds) return undefined;
  return decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
}

export type JwtResolution =
  | { ok: true; token: string; jwtExpiresAt: Date | null }
  | { ok: false; reason: ReAuthReason; jwtExpiresAt: Date | null };

/** Thrown from inside a cached function when the token vanished after the gate. */
export class MissingJwtError extends Error {
  constructor(username: string) {
    super(`No usable SPL JWT for ${username}`);
    this.name = "MissingJwtError";
  }
}

/**
 * Expiry-aware JWT lookup — the gate that keeps doomed (401/403) authenticated
 * calls from being made at all.
 *
 * A legacy account with `jwtExpiresAt = null` ("unknown") is treated as usable,
 * matching `getAccountsDueForSync` in the worker; those accounts are already
 * surfaced for a voluntary re-auth by `getTokenAlertAccounts`.
 */
export async function resolveUsableJwt(username: string): Promise<JwtResolution> {
  const creds = await getSplAccountCredentials(username.trim().toLowerCase());
  if (!creds) return { ok: false, reason: "no_token", jwtExpiresAt: null };

  const jwtExpiresAt = creds.jwtExpiresAt ?? null;
  if (getTokenExpiryState(jwtExpiresAt) === "expired") {
    return { ok: false, reason: "token_expired", jwtExpiresAt };
  }

  try {
    return {
      ok: true,
      token: decryptToken(creds.encryptedToken, creds.iv, creds.authTag),
      jwtExpiresAt,
    };
  } catch {
    // Corrupt/undecryptable row — same treatment `verifyMonitoredAccountToken` gives it.
    return { ok: false, reason: "no_token", jwtExpiresAt };
  }
}
