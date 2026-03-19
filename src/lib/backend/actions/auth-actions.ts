"use server";

import { splLogin } from "@/lib/backend/api/spl/spl-api";
import { decryptToken, encryptToken } from "@/lib/backend/auth/encryption";
import logger from "@/lib/backend/log/logger.server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

const USER_COOKIE = "spl_user_id";

// ─── Auth status ─────────────────────────────────────────────────────────────

export async function getAuthStatus() {
  try {
    const user = await getCurrentUser();
    if (!user) return { authenticated: false, username: null };
    return { authenticated: true, username: user.username };
  } catch (error) {
    logger.error(`getAuthStatus error: ${error}`);
    return { authenticated: false, username: null };
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginAction(username: string, timestamp: number, signature: string) {
  try {
    logger.info(`loginAction: ${username}`);

    const splResponse = await splLogin(username, timestamp, signature);
    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    const { encryptedValue, iv, authTag } = await encryptToken(splResponse.token);

    // Upsert the app user (identity only — token NOT stored here)
    const user = await prisma.user.upsert({
      where: { username },
      create: { username },
      update: {},
    });

    // Upsert the shared SplAccount (token lives here, shared across users)
    await prisma.splAccount.upsert({
      where: { username },
      create: { username, encryptedToken: encryptedValue, iv, authTag },
      update: { encryptedToken: encryptedValue, iv, authTag },
    });

    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    logger.info(`User ${username} logged in successfully`);
    return { success: true, username: user.username };
  } catch (error) {
    logger.error(`loginAction error: ${error}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction() {
  return logout();
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_COOKIE);
    return { success: true };
  } catch (error) {
    logger.error(`logout error: ${error}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Monitor accounts: smart-add ─────────────────────────────────────────────

/**
 * Check whether a username is already being monitored by this user.
 * Keychain is always required to add an account — this only guards against duplicates.
 *
 * Returns one of:
 *  - { status: 'already_monitoring' }  – already in the user's list
 *  - { status: 'keychain_required' }   – not yet monitored; caller must use Keychain
 *  - { status: 'error'; error }
 */
export async function checkAndAddMonitoredAccount(
  username: string
): Promise<
  | { status: "already_monitoring" }
  | { status: "keychain_required" }
  | { status: "error"; error: string }
> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;
    if (!userId) return { status: "error", error: "Not logged in" };

    const lc = username.toLowerCase();

    const existing = await prisma.monitoredAccount.findUnique({
      where: { userId_username: { userId, username: lc } },
    });
    if (existing) return { status: "already_monitoring" };

    return { status: "keychain_required" };
  } catch (error) {
    logger.error(`checkAndAddMonitoredAccount error: ${error}`);
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Called after a successful Keychain signature to add a monitored account.
 *
 * Smart-link logic:
 *  - If SplAccount already exists in the DB (added by another user) → create the
 *    MonitoredAccount junction row only; no SPL API call needed.
 *  - If SplAccount is new → validate via SPL API, store encrypted token, then link.
 *
 * Keychain is always required so the caller proves they hold the posting key.
 */
export async function addMonitoredAccountWithKeychain(
  username: string,
  timestamp: number,
  signature: string
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;
    if (!userId) return { success: false, error: "Not logged in" };

    const lc = username.toLowerCase();
    logger.info(`addMonitoredAccountWithKeychain: ${lc} for user ${userId}`);

    // Already in this user's list → caller shows a warning, not an error.
    const existingLink = await prisma.monitoredAccount.findUnique({
      where: { userId_username: { userId, username: lc } },
    });
    if (existingLink)
      return {
        success: false as const,
        alreadyMonitoring: true as const,
        error: "Account is already in your monitored list",
      };

    // SplAccount already in DB (linked by another user)?
    // Keychain proves posting-key possession; token is already stored — just link.
    const existingSpl = await prisma.splAccount.findUnique({ where: { username: lc } });
    if (existingSpl) {
      const link = await prisma.monitoredAccount.create({
        data: { userId, splAccountId: existingSpl.id, username: lc },
      });
      logger.info(`Linked existing SplAccount '${lc}' for user ${userId} (no SPL API call)`);
      return { success: true, accountId: link.id, username: lc };
    }

    // New account — validate via SPL API and store the token.
    const splResponse = await splLogin(lc, timestamp, signature);
    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    const { encryptedValue, iv, authTag } = await encryptToken(splResponse.token);

    // Upsert SplAccount in case another user raced in since the check above.
    const splAccount = await prisma.splAccount.upsert({
      where: { username: lc },
      create: { username: lc, encryptedToken: encryptedValue, iv, authTag },
      update: { encryptedToken: encryptedValue, iv, authTag },
    });

    const link = await prisma.monitoredAccount.upsert({
      where: { userId_username: { userId, username: lc } },
      create: { userId, splAccountId: splAccount.id, username: lc },
      update: {},
    });

    logger.info(`Monitored account '${lc}' added for user ${userId}`);
    return { success: true, accountId: link.id, username: lc };
  } catch (error) {
    logger.error(`addMonitoredAccountWithKeychain error: ${error}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;
    if (!userId) return null;

    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, createdAt: true },
    });
  } catch (error) {
    logger.error(`getCurrentUser error: ${error}`);
    return null;
  }
}

export async function getMonitoredAccounts() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;
    if (!userId) return [];

    return await prisma.monitoredAccount.findMany({
      where: { userId },
      select: { id: true, username: true, createdAt: true },
      orderBy: { username: "asc" },
    });
  } catch (error) {
    logger.error(`getMonitoredAccounts error: ${error}`);
    return [];
  }
}

export async function removeMonitoredAccount(accountId: string) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE)?.value;
    if (!userId) return { success: false, error: "Not logged in" };

    // Fetch before delete to get splAccountId for orphan check
    const record = await prisma.monitoredAccount.findUnique({
      where: { id: accountId, userId },
      select: { splAccountId: true },
    });
    if (!record) return { success: false, error: "Account not found" };

    await prisma.monitoredAccount.delete({
      where: { id: accountId, userId },
    });

    // If no other user monitors the same SplAccount, delete the token too
    const remainingLinks = await prisma.monitoredAccount.count({
      where: { splAccountId: record.splAccountId },
    });
    if (remainingLinks === 0) {
      await prisma.splAccount.delete({ where: { id: record.splAccountId } });
      logger.info(`SplAccount ${record.splAccountId} deleted — no remaining links`);
    }

    logger.info(`Monitored account ${accountId} removed`);
    return { success: true };
  } catch (error) {
    logger.error(`removeMonitoredAccount error: ${error}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Token helpers (internal use only) ───────────────────────────────────────

/**
 * Returns the decrypted SPL token for a given Splinterlands username.
 */
export async function getSplAccountToken(username: string): Promise<string | null> {
  try {
    const splAccount = await prisma.splAccount.findUnique({
      where: { username },
      select: { encryptedToken: true, iv: true, authTag: true },
    });
    if (!splAccount) return null;
    return await decryptToken(splAccount.encryptedToken, splAccount.iv, splAccount.authTag);
  } catch (error) {
    logger.error(`getSplAccountToken error: ${error}`);
    return null;
  }
}
