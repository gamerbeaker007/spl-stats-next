import { fetchSettings, verifySplToken } from "@/lib/backend/api/spl/spl-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import {
  markBalanceMetaSyncFailed,
  resetStaleSyncStates,
} from "@/lib/backend/db/account-sync-states";
import { pruneLogs } from "@/lib/backend/db/logs";
import { getAllSeasons } from "@/lib/backend/db/seasons";
import { pruneExpiredSessions } from "@/lib/backend/db/sessions";
import {
  getDistinctAccountsWithCredentials,
  getDistinctMonitoredUsernames,
  updateSplAccountStatusByUsername,
} from "@/lib/backend/db/spl-accounts";
import {
  completeWorkerRun,
  createWorkerRun,
  updateWorkerRunProgress,
} from "@/lib/backend/db/worker-runs";
import logger from "@/lib/backend/log/logger.server";
import { Season } from "@prisma/client";
import { syncSeasonBalances } from "./lib/balance-sync";
import { syncBattleHistory } from "./lib/battle-history-sync";
import {
  interruptibleSleep,
  registerShutdownHandlers,
  shouldShutdown,
} from "./lib/graceful-shutdown";
import { syncLeaderboard } from "./lib/leaderboard-sync";
import { syncPortfolio } from "./lib/portfolio-sync";
import { syncSeasonsEndDates } from "./lib/season-end-dates-sync";
import { LOG_RETENTION_DAYS, WORKER_INTERVAL_MS } from "./lib/worker-config";

registerShutdownHandlers();

type AccountWithCredentials = Awaited<
  ReturnType<typeof getDistinctAccountsWithCredentials>
>[number];

/**
 * Syncs balance history and battle history for accounts with a valid SPL token.
 * Both endpoints require authentication.
 */
async function runTokenDependentSyncs(
  accounts: AccountWithCredentials[],
  allSeasons: Season[],
  runId: string,
  processedUsernames: Set<string>
): Promise<void> {
  for (const account of accounts) {
    if (shouldShutdown()) {
      logger.info("Worker: shutdown requested, stopping gracefully");
      return;
    }

    logger.info(`Worker: syncing token-dependent data for ${account.username}`);
    let anySuccess = false;

    let tokenDecrypted = "";
    let tokenOk = false;
    try {
      tokenDecrypted = decryptToken(account.encryptedToken, account.iv, account.authTag);
      const verifyResult = await verifySplToken(account.username, tokenDecrypted);
      if (verifyResult === "invalid") {
        logger.warn(
          `Worker: token invalid for ${account.username} — marking invalid, skipping token-dependent syncs`
        );
        await updateSplAccountStatusByUsername(account.username, "invalid");
        await markBalanceMetaSyncFailed(account.username, "Token invalidated");
      } else if (verifyResult === "error") {
        logger.warn(
          `Worker: token verification failed (transient) for ${account.username} — skipping this cycle`
        );
      } else {
        tokenOk = true;
      }
    } catch (error) {
      await updateSplAccountStatusByUsername(account.username, "invalid");
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: token decrypt/check failed for ${account.username}: ${msg}`);
      await markBalanceMetaSyncFailed(account.username, `Token check error: ${msg}`);
    }

    if (!tokenOk) continue;

    try {
      await syncSeasonBalances(account, allSeasons, tokenDecrypted);
      anySuccess = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: failed to sync balances ${account.username}: ${msg}`);
    }

    if (shouldShutdown()) {
      logger.info("Worker: shutdown requested, stopping gracefully");
      return;
    }

    try {
      await syncBattleHistory(account, tokenDecrypted);
      anySuccess = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: failed to sync battle history ${account.username}: ${msg}`);
    }

    if (anySuccess && !processedUsernames.has(account.username)) {
      processedUsernames.add(account.username);
      await updateWorkerRunProgress(runId, processedUsernames.size);
    }
  }
}

/**
 * Syncs leaderboard rankings and portfolio snapshots for ALL monitored accounts.
 * Neither endpoint requires a valid SPL token, so this runs even when the token
 * is invalid or unknown.
 */
async function runPublicSyncs(
  usernames: string[],
  allSeasons: Season[],
  currentSeasonId: number,
  runId: string,
  processedUsernames: Set<string>
): Promise<void> {
  for (const username of usernames) {
    if (shouldShutdown()) {
      logger.info("Worker: shutdown requested, stopping gracefully");
      return;
    }

    logger.info(`Worker: syncing public data for ${username}`);
    let anySuccess = false;

    try {
      await syncLeaderboard(username, allSeasons, currentSeasonId);
      anySuccess = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: failed to sync leaderboard ${username}: ${msg}`);
    }

    if (shouldShutdown()) {
      logger.info("Worker: shutdown requested, stopping gracefully");
      return;
    }

    try {
      await syncPortfolio(username);
      anySuccess = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: failed to sync portfolio ${username}: ${msg}`);
    }

    if (anySuccess && !processedUsernames.has(username)) {
      processedUsernames.add(username);
      await updateWorkerRunProgress(runId, processedUsernames.size);
    }
  }
}

async function runCycle(): Promise<void> {
  const run = await createWorkerRun();
  const processedUsernames = new Set<string>();

  try {
    // Step 1: Check settings — bail early if game is in maintenance mode
    const settings = await fetchSettings();
    const currentSeasonId = settings.season.id;

    if (settings.maintenance_mode) {
      logger.info("Worker: game is in maintenance mode, skipping cycle");
      await completeWorkerRun(run.id, "completed", 0);
      return;
    }

    // Step 2: Sync season end dates
    logger.info("Worker: starting season sync");
    await syncSeasonsEndDates(currentSeasonId);

    if (shouldShutdown()) {
      await completeWorkerRun(run.id, "completed", 0);
      return;
    }

    // Step 3: Reset interrupted/failed sync states from previous run
    await resetStaleSyncStates();

    // Step 4: Load all seasons
    const allSeasons = await getAllSeasons();
    if (allSeasons.length === 0) {
      logger.warn("No seasons in DB, skipping");
      await completeWorkerRun(run.id, "completed", 0);
      return;
    }

    // Step 5: Fetch account lists
    const tokenAccounts = await getDistinctAccountsWithCredentials();
    const allMonitoredUsernames = await getDistinctMonitoredUsernames();
    logger.info(
      `Worker: ${tokenAccounts.length} accounts with valid token, ${allMonitoredUsernames.length} total monitored`
    );

    // Step 6: Token-dependent syncs (balance history + battle history)
    // Only runs for accounts with a valid SPL token.
    logger.info("Worker: starting token-dependent syncs (balance + battles)");
    await runTokenDependentSyncs(tokenAccounts, allSeasons, run.id, processedUsernames);

    if (shouldShutdown()) {
      await completeWorkerRun(run.id, "completed", processedUsernames.size);
      return;
    }

    // Step 7: Public syncs (leaderboard + portfolio — no token required)
    // Runs for ALL monitored accounts, including those with an invalid/unknown token.
    logger.info("Worker: starting public syncs (leaderboard + portfolio)");
    await runPublicSyncs(
      allMonitoredUsernames,
      allSeasons,
      currentSeasonId,
      run.id,
      processedUsernames
    );

    // Final step: prune old log entries and expired sessions
    try {
      const { count } = await pruneLogs(LOG_RETENTION_DAYS);
      if (count > 0)
        logger.info(`Worker: pruned ${count} log entries older than ${LOG_RETENTION_DAYS} days`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`Worker: log pruning failed: ${msg}`);
    }
    try {
      await pruneExpiredSessions();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`Worker: session pruning failed: ${msg}`);
    }

    await completeWorkerRun(run.id, "completed", processedUsernames.size);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await completeWorkerRun(run.id, "failed", processedUsernames.size, msg);
    logger.error(`Worker: cycle failed: ${msg}`);
  }
}

async function main(): Promise<void> {
  logger.info("Worker: starting background worker");

  while (!shouldShutdown()) {
    const cycleStart = Date.now();
    await runCycle();

    if (shouldShutdown()) break;

    const elapsed = Date.now() - cycleStart;
    const sleepTime = Math.max(0, WORKER_INTERVAL_MS - elapsed);

    if (sleepTime > 0) {
      logger.info(
        `Worker: cycle took ${Math.round(elapsed / 1000)}s, sleeping ${Math.round(sleepTime / 1000)}s`
      );
      await interruptibleSleep(sleepTime);
    } else {
      logger.info(
        `Worker: cycle took ${Math.round(elapsed / 1000)}s (exceeded interval), running next immediately`
      );
    }
  }

  logger.info("Worker: shut down cleanly");
  process.exit(0);
}

main();
