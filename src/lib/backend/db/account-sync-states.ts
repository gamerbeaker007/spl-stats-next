import prisma from "@/lib/prisma";

export async function getOrCreateSyncState(username: string, key: string) {
  return prisma.accountSyncState.upsert({
    where: { username_key: { username, key } },
    create: { username, key },
    update: {},
  });
}

export async function updateSyncState(
  id: string,
  data: {
    lastSeasonProcessed?: number;
    lastSyncedCreatedDate?: Date | null;
    lastRunAt?: Date | null;
    status?: "pending" | "processing" | "completed" | "failed";
    errorMessage?: string | null;
  }
) {
  return prisma.accountSyncState.update({ where: { id }, data });
}

/** Reset interrupted or failed sync states so they get retried. */
export async function resetStaleSyncStates() {
  return prisma.accountSyncState.updateMany({
    where: { status: { in: ["processing", "failed"] } },
    data: { status: "pending", errorMessage: null },
  });
}

export async function getSyncStatesForAccount(username: string) {
  return prisma.accountSyncState.findMany({ where: { username } });
}

export async function getAllSyncStates() {
  return prisma.accountSyncState.findMany({
    orderBy: [{ username: "asc" }, { key: "asc" }],
  });
}

export async function getSyncStatesForUsernames(usernames: string[]) {
  return prisma.accountSyncState.findMany({
    where: { username: { in: usernames } },
  });
}

/** Mark all sync states for an account as failed (e.g. token invalidated). */
export async function markAllSyncStatesFailedByUsername(username: string, errorMessage: string) {
  return prisma.accountSyncState.updateMany({
    where: { username },
    data: { status: "failed", errorMessage },
  });
}

/**
 * Mark only the BALANCE_META sync state as failed for an account.
 *
 * Used when a token is invalid: balance syncs are token-dependent and must be
 * flagged, but leaderboard and portfolio run without a token and should not
 * inherit the error message (which would persist indefinitely because those
 * syncs complete in the same cycle without clearing errorMessage).
 */
export async function markBalanceMetaSyncFailed(username: string, errorMessage: string) {
  return prisma.accountSyncState.updateMany({
    where: { username, key: "BALANCE_META" },
    data: { status: "failed", errorMessage },
  });
}

export async function deleteSyncStatesByUsername(username: string) {
  return prisma.accountSyncState.deleteMany({ where: { username } });
}

/**
 * Reset sync states after a successful token re-authentication:
 *  - BALANCE_META is reset unconditionally (even from "completed") so the worker
 *    re-queues a fresh balance sync with the new token.
 *  - All other rows that are in "failed" state are cleared so the aggregate
 *    no longer shows "sync error" after re-auth.
 */
export async function resetSyncStatesOnReAuth(username: string) {
  // Clear lastRunAt so the 24-h skip-gate re-opens immediately.
  // Without this the worker would pick up the account, find no trigger (< 24 h
  // since last run), skip the per-token syncs, and leave them stuck in "pending".
  await prisma.accountSyncState.updateMany({
    where: { username, key: "BALANCE_META" },
    data: { status: "pending", errorMessage: null, lastRunAt: null },
  });
  await prisma.accountSyncState.updateMany({
    where: { username, key: { not: "BALANCE_META" }, status: "failed" },
    data: { status: "pending", errorMessage: null },
  });
}

/** @deprecated Use resetSyncStatesOnReAuth instead. */
export async function clearBalanceMetaSyncError(username: string) {
  return prisma.accountSyncState.updateMany({
    where: { username, key: "BALANCE_META", status: "failed" },
    data: { status: "pending", errorMessage: null },
  });
}
