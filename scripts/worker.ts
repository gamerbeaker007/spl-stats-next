import { fetchSettings } from "@/lib/backend/api/spl/spl-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import {
  markBalanceMetaSyncFailed,
  resetStaleSyncStates,
} from "@/lib/backend/db/account-sync-states";
import { pruneLogs } from "@/lib/backend/db/logs";
import { getAllSeasons } from "@/lib/backend/db/seasons";
import { pruneExpiredSessions } from "@/lib/backend/db/sessions";
import {
  getAccountsDueForSync,
  getDistinctMonitoredUsernames,
  markExpiredJwtsInvalid,
  updateSplAccountLastSync,
  updateSplAccountStatusByUsername,
} from "@/lib/backend/db/spl-accounts";
import {
  completeWorkerRun,
  createWorkerRun,
  markStaleWorkerRunsFailed,
  pruneOldWorkerRuns,
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
import {
  LOG_RETENTION_DAYS,
  SYNC_INTERVAL_MS,
  WORKER_CHECK_INTERVAL_MS,
  WORKER_INTERVAL_MS,
} from "./lib/worker-config";

registerShutdownHandlers();

type AccountDueForSync = Awaited<ReturnType<typeof getAccountsDueForSync>>[number];

/**
 * Processes a single account's token-dependent syncs (balance + battle history).
 * JWT expiry is pre-filtered by getAccountsDueForSync, so no API verify needed.
 */
async function processAccount(account: AccountDueForSync, allSeasons: Season[]): Promise<boolean> {
  let jwtDecrypted = "";
  try {
    jwtDecrypted = decryptToken(account.encryptedToken, account.iv, account.authTag);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Worker: token decrypt failed for ${account.username}: ${msg}`);
    await updateSplAccountStatusByUsername(account.username, "invalid");
    await markBalanceMetaSyncFailed(account.username, `Token decrypt error: ${msg}`);
    return false;
  }

  let anySuccess = false;

  try {
    await syncSeasonBalances(account, allSeasons, jwtDecrypted);
    anySuccess = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Worker: failed to sync balances ${account.username}: ${msg}`);
  }

  if (shouldShutdown()) return anySuccess;

  try {
    await syncBattleHistory(account, jwtDecrypted);
    anySuccess = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Worker: failed to sync battle history ${account.username}: ${msg}`);
  }

  return anySuccess;
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

/**
 * One check cycle: processes all accounts due for sync, then returns.
 * Public syncs (leaderboard/portfolio) run on a separate timer.
 */
async function runQueueCycle(
  allSeasons: Season[],
  currentSeasonId: number,
  runId: string,
  processedUsernames: Set<string>
): Promise<void> {
  // Mark accounts with an expired JWT as invalid so the UI can surface the
  // re-auth prompt without the user visiting the Users page first.
  const markedInvalid = await markExpiredJwtsInvalid();
  if (markedInvalid > 0) {
    logger.info(`Worker: marked ${markedInvalid} account(s) with expired JWT as invalid`);
  }

  const cutoff = new Date(Date.now() - SYNC_INTERVAL_MS);
  const accountsDue = await getAccountsDueForSync(cutoff);

  if (accountsDue.length === 0) {
    logger.info("Worker: no accounts due for sync this cycle");
    return;
  }

  logger.info(`Worker: ${accountsDue.length} account(s) due for token-dependent sync`);

  for (const account of accountsDue) {
    if (shouldShutdown()) {
      logger.info("Worker: shutdown requested, stopping gracefully");
      return;
    }

    logger.info(`Worker: syncing token-dependent data for ${account.username}`);
    const success = await processAccount(account, allSeasons);

    // Always update lastWorkerSyncAt so we don't retry immediately on transient failures.
    await updateSplAccountLastSync(account.username);

    if (success && !processedUsernames.has(account.username)) {
      processedUsernames.add(account.username);
      await updateWorkerRunProgress(runId, processedUsernames.size);
    }
  }
}

async function main(): Promise<void> {
  logger.info("Worker: starting background worker (queue-based)");

  // Mark any runs left in "running" state (from a previous crash) as failed.
  const { count: stale } = await markStaleWorkerRunsFailed();
  if (stale > 0) logger.warn(`Worker: marked ${stale} stale worker run(s) as failed`);

  // Prune stale runs from previous Docker lifetimes; keep the 10 most recent.
  const { count: pruned } = await pruneOldWorkerRuns(10);
  if (pruned > 0) logger.info(`Worker: pruned ${pruned} old worker run record(s)`);

  // Run an initial common setup once
  await syncSeasonsEndDates(0);
  await resetStaleSyncStates();

  const run = await createWorkerRun();
  const processedUsernames = new Set<string>();
  let lastPublicSyncAt = 0;
  let lastSeasonRefreshAt = 0;
  let allSeasons: Season[] = await getAllSeasons();
  let currentSeasonId = 0;

  while (!shouldShutdown()) {
    try {
      // Refresh seasons and settings periodically
      if (Date.now() - lastSeasonRefreshAt > WORKER_INTERVAL_MS) {
        const settings = await fetchSettings();
        currentSeasonId = settings.season.id;
        if (settings.maintenance_mode) {
          logger.info("Worker: game is in maintenance mode, skipping cycle");
          await interruptibleSleep(WORKER_CHECK_INTERVAL_MS);
          continue;
        }
        allSeasons = await getAllSeasons();
        await syncSeasonsEndDates(currentSeasonId);
        lastSeasonRefreshAt = Date.now();
      }

      // Process queue
      await runQueueCycle(allSeasons, currentSeasonId, run.id, processedUsernames);

      // Public syncs on 30-min timer
      if (Date.now() - lastPublicSyncAt > WORKER_INTERVAL_MS) {
        const allMonitoredUsernames = await getDistinctMonitoredUsernames();
        logger.info(
          `Worker: running public syncs for ${allMonitoredUsernames.length} monitored accounts`
        );
        await runPublicSyncs(
          allMonitoredUsernames,
          allSeasons,
          currentSeasonId,
          run.id,
          processedUsernames
        );

        // Periodic maintenance
        try {
          const { count } = await pruneLogs(LOG_RETENTION_DAYS);
          if (count > 0)
            logger.info(
              `Worker: pruned ${count} log entries older than ${LOG_RETENTION_DAYS} days`
            );
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

        lastPublicSyncAt = Date.now();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Worker: cycle error: ${msg}`);
    }

    if (!shouldShutdown()) {
      await interruptibleSleep(WORKER_CHECK_INTERVAL_MS);
    }
  }

  await completeWorkerRun(run.id, "completed", processedUsernames.size);
  logger.info("Worker: shut down cleanly");
  process.exit(0);
}

main();
