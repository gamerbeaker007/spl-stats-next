/**
 * Result shape for reads that depend on an account's SPL JWT.
 *
 * Shared between server actions and client hooks so every section of the
 * dashboard can distinguish "needs re-authentication" from a genuine failure
 * instead of collapsing both into `null`.
 *
 * `not logged in` / `not monitored` map to `error`, never to `needs_reauth` —
 * re-authenticating a monitored account cannot fix either, so offering the
 * button there would be misleading.
 */

/** Why an authenticated read could not run. Both are fixed by a re-auth. */
export type ReAuthReason = "no_token" | "token_expired";

export type AuthenticatedResult<T> =
  /** The authenticated call ran. */
  | { status: "ok"; data: T }
  /** Public subset returned without a token — no Authorization header was sent. */
  | { status: "partial"; data: T; reason: ReAuthReason; jwtExpiresAt: Date | null }
  /** No authenticated call was attempted. */
  | { status: "needs_reauth"; reason: ReAuthReason; jwtExpiresAt: Date | null }
  /** Not logged in, not monitored, upstream failure, missing season, … */
  | { status: "error"; message: string };

/** Auth state a section can render — mirrored by every hook's `authState`. */
export interface SectionAuthState {
  needsReAuth: boolean;
  reason?: ReAuthReason;
  jwtExpiresAt: Date | null;
}

export function authOk<T>(data: T): AuthenticatedResult<T> {
  return { status: "ok", data };
}

export function authPartial<T>(
  data: T,
  reason: ReAuthReason,
  jwtExpiresAt: Date | null
): AuthenticatedResult<T> {
  return { status: "partial", data, reason, jwtExpiresAt };
}

export function authNeedsReAuth<T>(
  reason: ReAuthReason,
  jwtExpiresAt: Date | null
): AuthenticatedResult<T> {
  return { status: "needs_reauth", reason, jwtExpiresAt };
}

export function authError<T>(message: string): AuthenticatedResult<T> {
  return { status: "error", message };
}

/**
 * Build the `authState` a section renders from an action result.
 * Returns `null` when nothing needs re-authentication.
 */
export function toSectionAuthState<T>(result: AuthenticatedResult<T>): SectionAuthState | null {
  if (result.status === "needs_reauth" || result.status === "partial") {
    return { needsReAuth: true, reason: result.reason, jwtExpiresAt: result.jwtExpiresAt };
  }
  return null;
}

/** Human-readable reason, shared by the notice component. */
export function reAuthReasonLabel(reason: ReAuthReason | undefined): string {
  return reason === "token_expired" ? "SPL token expired" : "no SPL token stored";
}
