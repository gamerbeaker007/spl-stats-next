import { fetchSettings } from "@/lib/backend/api/spl/spl-api";
import { resetStaleSyncStates } from "@/lib/backend/db/account-sync-states";
import { pruneLogs } from "@/lib/backend/db/logs";
import { pruneExpiredSessions } from "@/lib/backend/db/sessions";
import { getAllSeasons } from "@/lib/backend/db/seasons";
import { getDistinctAccountsWithCredentials } from "@/lib/backend/db/spl-accounts";
import { completeWorkerRun, createWorkerRun } from "@/lib/backend/db/worker-runs";
import logger from "@/lib/backend/log/logger.server";
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

async function runCycle(): Promise<void> {
  const run = await createWorkerRun();
  let accountsProcessed = 0;

  try {
    // Step 1: Check settings — bail early if game is in maintenance mode
    const settings = await fetchSettings();
    const currentSeasonId = settings.season.id;
    const maintenance = settings.maintenance_mode;

    if (maintenance) {
      logger.info("Worker: game is in maintenance mode, skipping cycle");
      await completeWorkerRun(run.id, "completed", accountsProcessed);
      return;
    }

    // Step 2: Sync season end dates
    logger.info("Worker: starting season sync");
    await syncSeasonsEndDates(currentSeasonId);

    if (shouldShutdown()) {
      await completeWorkerRun(run.id, "completed", accountsProcessed);
      return;
    }

    // Step 3: Reset interrupted/failed sync states from previous run
    await resetStaleSyncStates();

    // Step 4: Get all monitored accounts with valid tokens
    const accounts = await getDistinctAccountsWithCredentials();
    logger.info(`Worker: ${accounts.length} accounts to sync`);

    const allSeasons = await getAllSeasons();
    if (allSeasons.length === 0) {
      logger.warn(`No seasons in DB, skipping`);
      return;
    }

    // Step 5: Process each account
    for (const account of accounts) {
      if (shouldShutdown()) {
        logger.info("Worker: shutdown requested, stopping gracefully");
        break;
      }

      logger.info(`Worker: syncing account ${account.username}`);
      let anySuccess = false;

      try {
        await syncSeasonBalances(account, allSeasons);
        anySuccess = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync balances ${account.username}: ${msg}`);
      }

      if (shouldShutdown()) {
        logger.info("Worker: shutdown requested, stopping gracefully");
        break;
      }

      try {
        await syncLeaderboard(account.username, allSeasons, currentSeasonId);
        anySuccess = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync leaderboard ${account.username}: ${msg}`);
      }

      if (shouldShutdown()) {
        logger.info("Worker: shutdown requested, stopping gracefully");
        break;
      }

      try {
        await syncPortfolio(account.username);
        anySuccess = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync portfolio ${account.username}: ${msg}`);
      }

      if (shouldShutdown()) {
        logger.info("Worker: shutdown requested, stopping gracefully");
        break;
      }

      try {
        await syncBattleHistory(account);
        anySuccess = true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync battle history ${account.username}: ${msg}`);
      }

      if (anySuccess) {
        accountsProcessed++;
        logger.info(
          `Worker: finished account ${account.username} (${accountsProcessed}/${accounts.length})`
        );
      } else {
        logger.warn(`Worker: all syncs failed for ${account.username}, not counting as processed`);
      }
    }

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

    await completeWorkerRun(run.id, "completed", accountsProcessed);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await completeWorkerRun(run.id, "failed", accountsProcessed, msg);
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
