import logger from "@/lib/backend/log/logger.server";
import prisma from "@/lib/prisma";

export async function upsertSplAccount(
  username: string,
  encryptedToken: string,
  iv: string,
  authTag: string,
  jwtExpiresAt?: Date | null
) {
  // Log a fingerprint of what is being written so we can forensically trace
  // cases where the wrong token ends up in a row.
  // encryptedToken is hex — log its length and last 8 chars (not sensitive).
  const tokenFingerprint = `len=${encryptedToken.length} tail=${encryptedToken.slice(-8)}`;
  logger.info(
    `upsertSplAccount: writing JWT for '${username}' [${tokenFingerprint}] expires=${jwtExpiresAt?.toISOString() ?? "unknown"}`
  );
  const now = new Date();
  return prisma.splAccount.upsert({
    where: { username },
    create: {
      username,
      encryptedToken,
      iv,
      authTag,
      tokenStatus: "valid",
      tokenVerifiedAt: now,
      jwtExpiresAt: jwtExpiresAt ?? null,
    },
    update: {
      encryptedToken,
      iv,
      authTag,
      tokenStatus: "valid",
      tokenVerifiedAt: now,
      jwtExpiresAt: jwtExpiresAt ?? null,
    },
  });
}

export async function updateSplAccountStatus(id: string, status: "valid" | "invalid" | "unknown") {
  return prisma.splAccount.update({
    where: { id },
    data: { tokenStatus: status, tokenVerifiedAt: new Date() },
  });
}

export async function updateSplAccountStatusByUsername(
  username: string,
  status: "valid" | "invalid" | "unknown"
) {
  return prisma.splAccount.update({
    where: { username },
    data: { tokenStatus: status, tokenVerifiedAt: new Date() },
  });
}

export async function findSplAccountByUsername(username: string) {
  return prisma.splAccount.findUnique({ where: { username } });
}

export async function getSplAccountTokenStatus(username: string) {
  return prisma.splAccount.findUnique({
    where: { username },
    select: { tokenStatus: true },
  });
}

export async function getSplAccountCredentials(username: string) {
  return prisma.splAccount.findUnique({
    where: { username },
    select: { encryptedToken: true, iv: true, authTag: true, jwtExpiresAt: true },
  });
}

export async function deleteSplAccount(id: string) {
  return prisma.splAccount.delete({ where: { id } });
}

/**
 * Returns accounts that are due for a worker sync cycle.
 * Due = not "invalid", JWT not expired, and not synced within the given cutoff window.
 * Accounts with no jwtExpiresAt (legacy tokens) are included for backward compatibility.
 */
export async function getAccountsDueForSync(cutoffDate: Date) {
  const now = new Date();
  return prisma.splAccount.findMany({
    where: {
      tokenStatus: { not: "invalid" },
      monitoredBy: { some: {} },
      OR: [{ lastWorkerSyncAt: null }, { lastWorkerSyncAt: { lt: cutoffDate } }],
      AND: [{ OR: [{ jwtExpiresAt: null }, { jwtExpiresAt: { gt: now } }] }],
    },
    select: {
      id: true,
      username: true,
      encryptedToken: true,
      iv: true,
      authTag: true,
      jwtExpiresAt: true,
      lastWorkerSyncAt: true,
    },
    orderBy: { lastWorkerSyncAt: "asc" },
  });
}

/**
 * Mark an account as synced now. Called by the worker after completing a sync cycle.
 */
export async function updateSplAccountLastSync(username: string) {
  return prisma.splAccount.update({
    where: { username },
    data: { lastWorkerSyncAt: new Date() },
  });
}

/**
 * Clear the last worker sync timestamp so the worker picks up this account
 * in the next queue check. Called after a successful re-authentication so
 * freshly issued JWT credentials are used immediately.
 */
export async function resetSplAccountWorkerSync(username: string) {
  return prisma.splAccount.update({
    where: { username },
    data: { lastWorkerSyncAt: null },
  });
}

/**
 * Marks all accounts whose JWT has expired as "invalid".
 * Called by the worker on each check cycle so the UI can surface the re-auth
 * prompt without waiting for the user to visit the Users page.
 * Returns the number of accounts updated.
 */
export async function markExpiredJwtsInvalid(): Promise<number> {
  const result = await prisma.splAccount.updateMany({
    where: {
      jwtExpiresAt: { lt: new Date() },
      tokenStatus: { not: "invalid" },
    },
    data: { tokenStatus: "invalid" },
  });
  return result.count;
}

/**
 * Returns distinct SPL accounts that are monitored by at least one user
 * and have a valid token. Used by the worker to know which accounts to sync.
 */
export async function getDistinctAccountsWithCredentials() {
  return prisma.splAccount.findMany({
    where: {
      tokenStatus: "valid",
      monitoredBy: { some: {} },
    },
    select: {
      id: true,
      username: true,
      encryptedToken: true,
      iv: true,
      authTag: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns distinct usernames for all SPL accounts monitored by at least one user,
 * regardless of token status. Used by the worker for token-independent syncs
 * (leaderboard + portfolio) so those still run even when the token is invalid.
 */
export async function getDistinctMonitoredUsernames(): Promise<string[]> {
  const accounts = await prisma.splAccount.findMany({
    where: { monitoredBy: { some: {} } },
    select: { username: true },
    orderBy: { createdAt: "asc" },
  });
  return accounts.map((a) => a.username);
}

/**
 * Returns token status for all SPL accounts monitored by at least one user.
 * Used by the admin page for a quick overview.
 */
export async function getAllMonitoredAccountTokenStatuses() {
  return prisma.splAccount.findMany({
    where: { monitoredBy: { some: {} } },
    select: {
      username: true,
      tokenStatus: true,
      tokenVerifiedAt: true,
      jwtExpiresAt: true,
    },
    orderBy: { username: "asc" },
  });
}
