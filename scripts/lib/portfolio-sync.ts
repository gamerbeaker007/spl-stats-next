/**
 * Portfolio sync — runs once per calendar day per monitored account.
 *
 * Sync state key: "PORTFOLIO"
 * Uses AccountSyncState.lastSyncedCreatedDate to track when the last full sync ran.
 * If shutdown is requested mid-fetch, the state stays "processing" and
 * resetStaleSyncStates() resets it to "pending" on the next worker startup.
 */
import { getOrCreateSyncState, updateSyncState } from "@/lib/backend/db/account-sync-states";
import { upsertPortfolioSnapshot } from "@/lib/backend/db/portfolio-snapshots";
import logger from "@/lib/backend/log/logger.server";
import { shouldShutdown } from "./graceful-shutdown";
import { computePortfolioData } from "./service/portfolio-data";

const PORTFOLIO_SYNC_KEY = "PORTFOLIO";

function isTodayUtc(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

export async function syncPortfolio(username: string): Promise<void> {
  const syncState = await getOrCreateSyncState(username, PORTFOLIO_SYNC_KEY);

  // Skip if already completed today
  if (isTodayUtc(syncState.lastSyncedCreatedDate)) {
    logger.info(`portfolioSync ${username}: already synced today, skipping`);
    return;
  }

  await updateSyncState(syncState.id, { status: "processing" });

  try {
    const data = await computePortfolioData(username, shouldShutdown);

    if (data === null) {
      // Shutdown was requested mid-fetch — leave state as "processing"
      // so resetStaleSyncStates() picks it up on the next startup.
      logger.info(`portfolioSync ${username}: interrupted by shutdown`);
      return;
    }

    await upsertPortfolioSnapshot(data);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await updateSyncState(syncState.id, {
      status: "completed",
      lastSyncedCreatedDate: today,
    });

    logger.info(
      `portfolioSync ${username}: done — collection $${data.collectionMarketValue.toFixed(2)}`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`portfolioSync ${username}: ${msg}`);
    await updateSyncState(syncState.id, { status: "failed", errorMessage: msg });
  }
}
