import prisma from "@/lib/prisma";
import logger from "@/lib/backend/log/logger.server";

export async function upsertSplAccount(
  username: string,
  encryptedToken: string,
  iv: string,
  authTag: string
) {
  // Log a fingerprint of what is being written so we can forensically trace
  // cases where the wrong token ends up in a row.
  // encryptedToken is hex — log its length and last 8 chars (not sensitive).
  const tokenFingerprint = `len=${encryptedToken.length} tail=${encryptedToken.slice(-8)}`;
  logger.info(`upsertSplAccount: writing token for '${username}' [${tokenFingerprint}]`);
  const now = new Date();
  return prisma.splAccount.upsert({
    where: { username },
    create: { username, encryptedToken, iv, authTag, tokenStatus: "valid", tokenVerifiedAt: now },
    update: { encryptedToken, iv, authTag, tokenStatus: "valid", tokenVerifiedAt: now },
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
    select: { encryptedToken: true, iv: true, authTag: true },
  });
}

export async function deleteSplAccount(id: string) {
  return prisma.splAccount.delete({ where: { id } });
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
    },
    orderBy: { username: "asc" },
  });
}
