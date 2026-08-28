import axios from "axios";

/**
 * True for an HTTP 401/403 from an SPL / vAPI call — i.e. the JWT is dead
 * (expired mid-run, or revoked because the player logged in elsewhere).
 *
 * Deliberately narrow: only these two statuses. A broader predicate would make
 * transient upstream failures look like auth failures, and the worker reacts to
 * an auth failure by parking the account until the user re-authenticates.
 *
 * Imports only `axios` on purpose — this module is used by the standalone `tsx`
 * worker as well as the Next.js server, so it must stay free of Next imports.
 */
export function isAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}
