"use server";

import { splLogin, verifySplToken } from "@/lib/backend/api/spl/spl-api";
import { deleteUserCookie, getUserIdFromCookie, setUserCookie } from "@/lib/backend/auth/cookie";
import { decryptToken, encryptToken } from "@/lib/backend/auth/encryption";
import { verifyHiveSignature } from "@/lib/backend/auth/hive-verify";
import { deleteSyncStatesByUsername } from "@/lib/backend/db/account-sync-states";
import {
  countMonitoredAccountsBySplAccount,
  createMonitoredAccount,
  deleteMonitoredAccount,
  findMonitoredAccount,
  findMonitoredAccountById,
  listMonitoredAccounts,
  upsertMonitoredAccount,
} from "@/lib/backend/db/monitored-accounts";
import {
  deleteOpponentBattleCardsByAccount,
  deletePlayerBattleCardsByAccount,
} from "@/lib/backend/db/battle-cards";
import { deletePlayerLeaderboardByUsername } from "@/lib/backend/db/player-leaderboard";
import { deletePortfolioInvestmentsByUsername } from "@/lib/backend/db/portfolio-investments";
import { deletePortfolioSnapshotsByUsername } from "@/lib/backend/db/portfolio-snapshots";
import { deleteSeasonBalancesByUsername } from "@/lib/backend/db/season-balances";
import {
  deleteSplAccount,
  findSplAccountByUsername,
  getSplAccountCredentials,
  getSplAccountTokenStatus,
  updateSplAccountStatus,
  upsertSplAccount,
} from "@/lib/backend/db/spl-accounts";
import { getUserById, upsertUser } from "@/lib/backend/db/users";
import logger from "@/lib/backend/log/logger.server";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

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

    // Reject signatures older than 5 minutes to prevent replay attacks
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return { success: false, error: "Signature expired. Please try again." };
    }

    const message = `${username.toLowerCase()}${timestamp}`;
    const valid = await verifyHiveSignature(username, message, signature);
    if (!valid) {
      logger.warn(`loginAction: invalid Hive signature for ${username}`);
      return { success: false, error: "Invalid signature. Please try again." };
    }

    const user = await upsertUser(username);
    await setUserCookie(user.id);

    logger.info(`User ${username} logged in successfully (Hive-only auth)`);
    return { success: true, username: user.username };
  } catch (error) {
    logger.error(`loginAction error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction() {
  try {
    await deleteUserCookie();
    return { success: true };
  } catch (error) {
    logger.error(`logout error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

// ─── Monitor accounts: smart-add ─────────────────────────────────────────────

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
    const userId = await getUserIdFromCookie();
    if (!userId) return { success: false, error: "Not logged in" };

    const lc = username.toLowerCase();
    logger.info(`addMonitoredAccountWithKeychain: ${lc} for user ${userId}`);

    // Already in this user's list → caller shows a warning, not an error.
    const existingLink = await findMonitoredAccount(userId, lc);
    if (existingLink)
      return {
        success: false as const,
        alreadyMonitoring: true as const,
        error: "Account is already in your monitored list",
      };

    // Reject signatures older than 5 minutes to prevent replay attacks
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return { success: false, error: "Signature expired. Please try again." };
    }

    // Verify posting-key ownership against Hive blockchain before any DB/SPL writes
    const message = `${lc}${timestamp}`;
    const sigValid = await verifyHiveSignature(lc, message, signature);
    if (!sigValid) {
      logger.warn(`addMonitoredAccountWithKeychain: invalid Hive signature for ${lc}`);
      return { success: false, error: "Invalid Hive signature. Please try again." };
    }

    // SplAccount already in DB (linked by another user)?
    // Signature already verified — token is already stored — just link.
    const existingSpl = await findSplAccountByUsername(lc);
    if (existingSpl) {
      const link = await createMonitoredAccount(userId, existingSpl.id, lc);
      logger.info(`Linked existing SplAccount '${lc}' for user ${userId} (no SPL API call)`);
      return { success: true, accountId: link.id, username: lc };
    }

    // New account — fetch SPL token and store it.
    const splResponse = await splLogin(lc, timestamp, signature);
    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    const { encryptedValue, iv, authTag } = encryptToken(splResponse.token);

    // Upsert SplAccount in case another user raced in since the check above.
    const splAccount = await upsertSplAccount(lc, encryptedValue, iv, authTag);

    const link = await upsertMonitoredAccount(userId, splAccount.id, lc);

    logger.info(`Monitored account '${lc}' added for user ${userId}`);
    return { success: true, accountId: link.id, username: lc };
  } catch (error) {
    logger.error(`addMonitoredAccountWithKeychain error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return null;

    return await getUserById(userId);
  } catch (error) {
    // Suppress Next.js static-render probe errors (expected during build)
    const msg = errorMessage(error);
    if (!msg.includes("Dynamic server usage")) {
      logger.error(`getCurrentUser error: ${error}`);
    }
    return null;
  }
}

export async function getMonitoredAccounts() {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return [];

    return await listMonitoredAccounts(userId);
  } catch (error) {
    logger.error(`getMonitoredAccounts error: ${error}`);
    return [];
  }
}

export async function reAuthMonitoredAccount(
  username: string,
  timestamp: number,
  signature: string
) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return { success: false, error: "Not logged in" };

    logger.info(`reAuthMonitoredAccount: ${username} for user ${userId}`);

    const splResponse = await splLogin(username, timestamp, signature);
    if (!splResponse.token) {
      return { success: false, error: "No token received from Splinterlands" };
    }

    const { encryptedValue, iv, authTag } = encryptToken(splResponse.token);
    await upsertSplAccount(username, encryptedValue, iv, authTag);

    logger.info(`Token refreshed for '${username}'`);
    return { success: true, username };
  } catch (error) {
    logger.error(`reAuthMonitoredAccount error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

export async function verifyMonitoredAccountToken(monitoredAccountId: string) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return { success: false, error: "Not logged in" };

    const record = await findMonitoredAccountById(monitoredAccountId, userId);
    if (!record) return { success: false, error: "Account not found" };

    const creds = await getSplAccountCredentials(record.username);
    if (!creds) return { success: false, error: "SplAccount not found" };

    let token: string;
    try {
      token = decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
    } catch {
      await updateSplAccountStatus(record.splAccountId, "invalid");
      return { success: true, status: "invalid" as const };
    }

    const valid = await verifySplToken(record.username, token);
    const status = valid ? ("valid" as const) : ("invalid" as const);
    await updateSplAccountStatus(record.splAccountId, status);

    return { success: true, status };
  } catch (error) {
    logger.error(`verifyMonitoredAccountToken error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

export async function getAccountTokenStatus(
  username: string
): Promise<"valid" | "invalid" | "unknown" | "not_found"> {
  try {
    const account = await getSplAccountTokenStatus(username.toLowerCase());
    if (!account) return "not_found";
    return account.tokenStatus as "valid" | "invalid" | "unknown";
  } catch {
    return "not_found";
  }
}

export async function removeMonitoredAccount(accountId: string) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return { success: false, error: "Not logged in" };

    // Fetch before delete to get splAccountId for orphan check
    const record = await findMonitoredAccountById(accountId, userId);
    if (!record) return { success: false, error: "Account not found" };

    await deleteMonitoredAccount(accountId, userId);

    // If no other user monitors the same SplAccount, delete the token and all collected data
    const remainingLinks = await countMonitoredAccountsBySplAccount(record.splAccountId);
    if (remainingLinks === 0) {
      await Promise.all([
        deleteSplAccount(record.splAccountId),
        deleteSyncStatesByUsername(record.username),
        deleteSeasonBalancesByUsername(record.username),
        deletePlayerLeaderboardByUsername(record.username),
        deletePlayerBattleCardsByAccount(record.username),
        deleteOpponentBattleCardsByAccount(record.username),
        deletePortfolioSnapshotsByUsername(record.username),
        deletePortfolioInvestmentsByUsername(record.username),
      ]);
      logger.info(`SplAccount ${record.username} deleted — no remaining links, data purged`);
    }

    logger.info(`Monitored account ${record.username} removed`);
    return { success: true };
  } catch (error) {
    logger.error(`removeMonitoredAccount error: ${error}`);
    return { success: false, error: errorMessage(error) };
  }
}

/** Check whether removing the given monitored account would be the last link to the SplAccount,
 *  meaning all collected data would be permanently deleted on removal. */
export async function checkRemoveScopeAction(accountId: string): Promise<{ isLastUser: boolean }> {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return { isLastUser: false };
    const record = await findMonitoredAccountById(accountId, userId);
    if (!record) return { isLastUser: false };
    const remaining = await countMonitoredAccountsBySplAccount(record.splAccountId);
    return { isLastUser: remaining <= 1 };
  } catch {
    return { isLastUser: false };
  }
}
