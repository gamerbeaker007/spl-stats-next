/**
 * Version-skew helpers for the "new version available" snackbar.
 *
 * Each Docker build bakes a unique `DEPLOYMENT_ID` (git SHA) into both the client
 * bundle and the server (`NEXT_PUBLIC_DEPLOYMENT_ID`). A tab opened before a deploy
 * keeps its old id; `/api/version` returns the running server's id.
 */

/** Deployment id baked into this bundle. Empty in dev / builds without `DEPLOYMENT_ID`. */
export const CLIENT_DEPLOYMENT_ID = process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? "";

export const VERSION_ENDPOINT = "/api/version";

/** True when both ids are known and differ — the tab runs an older (or newer) build. */
export function isNewDeployment(clientId: string, serverId: string | null | undefined): boolean {
  return Boolean(clientId) && Boolean(serverId) && clientId !== serverId;
}

/**
 * True for the client-side error a stale tab gets when calling a Server Action that
 * no longer exists in the deployed build (Next.js `UnrecognizedActionError`).
 */
export function isStaleServerActionError(reason: unknown): boolean {
  if (!(reason instanceof Error)) return false;
  return (
    reason.name === "UnrecognizedActionError" ||
    reason.message.includes("was not found on the server") ||
    reason.message.includes("Failed to find Server Action")
  );
}
