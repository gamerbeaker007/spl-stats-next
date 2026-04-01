import { decryptToken } from "@/lib/backend/auth/encryption";
import { getOrCreateSyncState, updateSyncState } from "@/lib/backend/db/account-sync-states";
import { upsertSeasonBalanceBatch } from "@/lib/backend/db/season-balances";
import logger from "@/lib/backend/log/logger.server";
import { AggregatedEntry, syncBalanceTokenForSeason } from "./service/balance-history";
import {
  fetchAndDistributeUnclaimedBySeason,
  UNCLAIMED_MIN_SEASON,
} from "./service/unclaimed-balance-history";
import { BALANCE_HISTORY_TOKEN_TYPES } from "@/types/spl/balance";
import { AccountSyncState, Season } from "@prisma/client";
import { shouldShutdown } from "./graceful-shutdown";
import { buildSeasonsToProcess } from "./sync-utils";

export interface AccountCredentials {
  username: string;
  encryptedToken: string;
  iv: string;
  authTag: string;
}

/**
 * Run the season loop for one token: mark processing, iterate seasons, checkpoint, mark done/failed.
 */
async function processSeasonsForToken(
  syncState: AccountSyncState,
  username: string,
  seasons: Season[],
  logContext: string,
  fetch: (season: Season) => Promise<AggregatedEntry[]>
): Promise<void> {
  await updateSyncState(syncState.id, { status: "processing" });
  try {
    for (const season of seasons) {
      if (shouldShutdown()) return;
      const entries = await fetch(season);
      if (entries.length > 0) {
        await upsertSeasonBalanceBatch(
          entries.map((e) => ({ username, seasonId: season.id, ...e }))
        );
      }
      await updateSyncState(syncState.id, { lastSeasonProcessed: season.id });
    }
    await updateSyncState(syncState.id, { status: "completed" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`${logContext}: ${msg}`);
    await updateSyncState(syncState.id, { status: "failed", errorMessage: msg });
  }
}

async function syncBalances(
  username: string,
  decrypted: string,
  allSeasons: Season[],
  currentSeasonId: number
): Promise<void> {
  for (const [, tokenType] of BALANCE_HISTORY_TOKEN_TYPES.entries()) {
    if (shouldShutdown()) return;
    const syncState = await getOrCreateSyncState(username, tokenType);

    const seasonsToProcess = await buildSeasonsToProcess(
      username,
      allSeasons,
      currentSeasonId,
      syncState
    );
    if (!seasonsToProcess || seasonsToProcess.length === 0) continue;

    await processSeasonsForToken(
      syncState,
      username,
      seasonsToProcess,
      `syncSeasonBalances ${username}/${tokenType}`,
      (season) =>
        syncBalanceTokenForSeason(
          username,
          decrypted,
          tokenType,
          season,
          seasonsToProcess,
          currentSeasonId
        )
    );
  }
}

async function syncUnclaimedBalances(
  username: string,
  decrypted: string,
  allSeasons: Season[],
  currentSeasonId: number
): Promise<void> {
  const syncState = await getOrCreateSyncState(username, "UNCLAIMED");

  const seasonsToProcess = await buildSeasonsToProcess(
    username,
    allSeasons,
    currentSeasonId,
    syncState,
    UNCLAIMED_MIN_SEASON
  );
  if (!seasonsToProcess || seasonsToProcess.length === 0) return;

  // Fetch all history in one pass and distribute to season buckets in memory.
  // This avoids the O(n²) cost of restarting ID-based pagination for each season.
  const bySeasonId = await fetchAndDistributeUnclaimedBySeason(
    username,
    decrypted,
    allSeasons,
    seasonsToProcess
  );

  await processSeasonsForToken(
    syncState,
    username,
    seasonsToProcess,
    `syncUnclaimedBalances ${username}`,
    (season) => Promise.resolve(bySeasonId.get(season.id) ?? [])
  );
}

/**
 * Sync all balance data for a single account.
 * Handles shared setup once: decrypt, load seasons, sync states, join date (only when needed).
 */
export async function syncSeasonBalances(
  account: AccountCredentials,
  allSeasons: Season[],
  currentSeasonId: number
): Promise<void> {
  const { username } = account;
  const decrypted = decryptToken(account.encryptedToken, account.iv, account.authTag);

  await syncBalances(username, decrypted, allSeasons, currentSeasonId);
  if (!shouldShutdown())
    await syncUnclaimedBalances(username, decrypted, allSeasons, currentSeasonId);
}
