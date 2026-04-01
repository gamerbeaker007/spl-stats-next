import { fetchSettings } from "@/lib/backend/api/spl/spl-api";
import { getDistinctAccountsWithCredentials } from "@/lib/backend/db/spl-accounts";
import { resetStaleSyncStates } from "@/lib/backend/db/account-sync-states";
import { createWorkerRun, completeWorkerRun } from "@/lib/backend/db/worker-runs";
import logger from "@/lib/backend/log/logger.server";
import {
  registerShutdownHandlers,
  shouldShutdown,
  interruptibleSleep,
} from "./lib/graceful-shutdown";
import { syncSeasonsEndDates } from "./lib/season-end-dates-sync";
import { syncSeasonBalances } from "./lib/balance-sync";
import { syncLeaderboard } from "./lib/leaderboard-sync";
import { WORKER_INTERVAL_MS } from "./lib/worker-config";
import { getAllSeasons } from "@/lib/backend/db/seasons";

registerShutdownHandlers();

async function runCycle(): Promise<void> {
  const run = await createWorkerRun();
  let accountsProcessed = 0;

  try {
    // Step 1: Check settings — bail early if game is in maintenance mode
    const settings = await fetchSettings();
    const currentSeasonId = settings.season.id;
    const maintenance= settings.maintenance_mode;

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
      let seasonSuccess = false
      try {
        await syncSeasonBalances(account, allSeasons, currentSeasonId);
        seasonSuccess = true
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync balances ${account.username}: ${msg}`);
        // Continue with next account — don't let one failure stop the cycle
      }

      if (shouldShutdown()) {
        logger.info("Worker: shutdown requested, stopping gracefully");
        break;
      }

      let leaderboardSuccess = false
      try {
        await syncLeaderboard(account.username, allSeasons, currentSeasonId);
        leaderboardSuccess = true
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Worker: failed to sync leaderboard ${account.username}: ${msg}`);
        // Continue with next account — don't let one failure stop the cycle
      }

      if (seasonSuccess && leaderboardSuccess ){
        accountsProcessed++;
      }

      //TODO portfolio scan
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
