import { decryptToken } from "@/lib/backend/auth/encryption";
import { getOrCreateSyncState, updateSyncState } from "@/lib/backend/db/account-sync-states";
import { incrementSeasonBalanceBatch } from "@/lib/backend/db/season-balances";
import logger from "@/lib/backend/log/logger.server";
import { fetchPlayerHistory } from "@/lib/backend/api/spl/spl-api";
import { fetchBalanceHistoryDelta, IncrementalResult } from "./service/balance-history";
import {
  fetchIncrementalUnclaimedHistory,
  UNCLAIMED_MIN_SEASON,
} from "./service/unclaimed-balance-history";
import { BALANCE_HISTORY_TOKEN_TYPES } from "@/types/spl/balance";
import { ClaimSeasonLeagueRewardData } from "@/types/parsedHistory";
import { Season } from "@prisma/client";
import { shouldShutdown } from "./graceful-shutdown";
import { getPlayerFirstSeasonId } from "./sync-utils";
import { RESCAN_MIN_INTERVAL_MS } from "./worker-config";

export interface AccountCredentials {
  username: string;
  encryptedToken: string;
  iv: string;
  authTag: string;
}

async function applyDeltaRows(
  username: string,
  result: IncrementalResult,
  logContext: string
): Promise<void> {
  const rows: Array<{
    username: string;
    seasonId: number;
    token: string;
    type: string;
    amount: number;
    count: number;
  }> = [];

  for (const [seasonId, entries] of result.deltas) {
    for (const entry of entries) {
      rows.push({ username, seasonId, ...entry });
    }
  }

  if (rows.length > 0) {
    await incrementSeasonBalanceBatch(rows);
    logger.info(`${logContext}: +${rows.length} rows`);
  }
}

/**
 * Sync balance history for one token type, season by season.
 *
 * Uses lastSyncedCreatedDate as a cursor:
 *   - null   → first sync; compute start from the player's join date
 *   - Date   → resume from that point (last season end or last seen created_date)
 *
 * Each completed season is fetched as a separate chunk so the worker can shut down
 * and resume cleanly between seasons. The current (incomplete) season is always
 * fetched last, advancing the cursor to the most recent transaction seen.
 */
async function syncBalancesForToken(
  username: string,
  token: string,
  tokenType: string,
  allSeasons: Season[]
): Promise<void> {
  const tokenKey = tokenType as (typeof BALANCE_HISTORY_TOKEN_TYPES)[number];
  const syncState = await getOrCreateSyncState(username, tokenKey);
  let cursor: Date = syncState.lastSyncedCreatedDate ?? new Date(0);

  // On first sync (no cursor stored), pin the start to the player's join season
  // to avoid fetching years of history they weren't part of.
  if (!syncState.lastSyncedCreatedDate) {
    const firstSeasonId = await getPlayerFirstSeasonId(username, allSeasons);
    if (!firstSeasonId) {
      logger.warn(
        `syncBalances ${username}/${tokenKey}: could not determine join season, skipping`
      );
      return;
    }
    const sorted = [...allSeasons].sort((a, b) => a.id - b.id);
    const idx = sorted.findIndex((s) => s.id === firstSeasonId);
    if (idx > 0) {
      cursor = sorted[idx - 1].endsAt;
    } else {
      // Season 1 has no preceding season — approximate its start as 2 weeks before it ends.
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
      cursor = new Date(sorted[Math.max(idx, 0)].endsAt.getTime() - twoWeeksMs);
    }
  }

  // Seasons that still need data: those whose window ends after the cursor.
  const now = new Date();
  const pending = [...allSeasons].sort((a, b) => a.id - b.id).filter((s) => s.endsAt > cursor);

  if (pending.length === 0) return; // already up to date

  await updateSyncState(syncState.id, { status: "processing" });

  try {
    for (const season of pending) {
      if (shouldShutdown()) return;

      const isCurrentSeason = season.endsAt > now;
      // For completed seasons: fetch the fixed window (cursor, season.endsAt].
      // For the current season: fetch from cursor up to now (no upper bound).
      const result = await fetchBalanceHistoryDelta(
        username,
        tokenKey,
        token,
        allSeasons,
        cursor,
        isCurrentSeason ? undefined : season.endsAt
      );

      await applyDeltaRows(username, result, `syncBalances ${username}/${tokenKey}/S${season.id}`);

      // Advance the cursor and checkpoint.
      cursor = isCurrentSeason
        ? (result.maxCreatedDate ?? cursor) // advance to newest item seen
        : season.endsAt; // advance to definitive season boundary

      await updateSyncState(syncState.id, { lastSyncedCreatedDate: cursor });

      // The current season is always last — stop after processing it.
      if (isCurrentSeason) break;
    }

    await updateSyncState(syncState.id, { status: "completed" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`syncBalances ${username}/${tokenKey}: ${msg}`);
    await updateSyncState(syncState.id, { status: "failed", errorMessage: msg });
  }
}

/**
 * Sync unclaimed balance history in a single pass.
 *
 * Unlike balance_history, the unclaimed endpoint uses ID-based pagination with no
 * server-side date filter, so season-by-season chunking is not feasible. On first
 * sync this is a single large fetch; subsequent syncs only retrieve new items.
 */
async function syncUnclaimedBalances(
  username: string,
  token: string,
  allSeasons: Season[]
): Promise<void> {
  const syncState = await getOrCreateSyncState(username, "UNCLAIMED");

  // For the first sync, stop at the start of UNCLAIMED_MIN_SEASON to avoid
  // fetching history from before the endpoint existed.
  let oldestDate: Date | null = null;
  if (!syncState.lastSyncedCreatedDate) {
    const sorted = [...allSeasons].sort((a, b) => a.id - b.id);
    const idx = sorted.findIndex((s) => s.id === UNCLAIMED_MIN_SEASON);
    oldestDate = idx > 0 ? sorted[idx - 1].endsAt : new Date(0);
  }

  await updateSyncState(syncState.id, { status: "processing" });
  try {
    const result = await fetchIncrementalUnclaimedHistory(
      username,
      token,
      allSeasons,
      syncState.lastSyncedCreatedDate,
      oldestDate
    );

    await applyDeltaRows(username, result, `syncUnclaimed ${username}`);

    await updateSyncState(syncState.id, {
      status: "completed",
      ...(result.maxCreatedDate && { lastSyncedCreatedDate: result.maxCreatedDate }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`syncUnclaimedBalances ${username}: ${msg}`);
    await updateSyncState(syncState.id, { status: "failed", errorMessage: msg });
  }
}

/**
 * Returns true if the player claimed their league_season reward for the given season
 * after lastSyncDate. Only inspects the most recent page of history — if the claim
 * is older than the endpoint window (~a few seasons), returns false and the next
 * daily scan will pick up any resulting spillover tokens.
 */
async function wasSeasonRewardClaimed(
  username: string,
  token: string,
  seasonId: number,
  lastSyncDate: Date
): Promise<boolean> {
  try {
    const history = await fetchPlayerHistory(username, token, "claim_reward");
    return history.some(
      (entry) =>
        (entry.data as ClaimSeasonLeagueRewardData).type === "league_season" &&
        (entry.data as ClaimSeasonLeagueRewardData).season === seasonId &&
        new Date(entry.created_date) > lastSyncDate
    );
  } catch {
    // On error don't trigger an extra sync — the daily scan covers it.
    return false;
  }
}

/**
 * Sync all balance data for a single account.
 *
 * Skip logic — runs at most once per 24 h unless a trigger fires:
 *  - First sync:       always runs.
 *  - Season rollover:  latest completed season > BALANCE_META.lastSeasonProcessed.
 *  - Daily refresh:    last sync was > RESCAN_MIN_INTERVAL_MS (24 h) ago.
 *  - Claim trigger:    a league_season claim appeared after the last sync,
 *                      catching GLINT/token spillover from reward claims.
 *                      Falls back to the daily scan for claims outside the history window.
 *
 * Progress is tracked via a "BALANCE_META" AccountSyncState key per account.
 * Balance history is processed season-by-season with a shutdown checkpoint after each
 * season, allowing long initial syncs to be safely interrupted and resumed.
 * Unclaimed history is a single pass (API limitation).
 */
export async function syncSeasonBalances(
  account: AccountCredentials,
  allSeasons: Season[],
  tokenDecrypted: string
): Promise<void> {
  const { username } = account;
  const now = new Date();

  const latestCompletedSeason = [...allSeasons]
    .filter((s) => s.endsAt <= now)
    .sort((a, b) => b.id - a.id)[0];

  // BALANCE_META tracks the last full sync timestamp and last completed season covered.
  const metaState = await getOrCreateSyncState(username, "BALANCE_META");

  const isFirstSync = !metaState.lastSyncedCreatedDate;
  const newSeasonDetected =
    !!latestCompletedSeason && latestCompletedSeason.id > metaState.lastSeasonProcessed;
  const dailyCheckDue =
    !!metaState.lastSyncedCreatedDate &&
    now.getTime() - metaState.lastSyncedCreatedDate.getTime() > RESCAN_MIN_INTERVAL_MS;

  // Claim trigger: only API-check when no cheaper trigger already fired.
  let claimDetected = false;
  if (!isFirstSync && !newSeasonDetected && !dailyCheckDue && latestCompletedSeason) {
    claimDetected = await wasSeasonRewardClaimed(
      username,
      tokenDecrypted,
      latestCompletedSeason.id,
      metaState.lastSyncedCreatedDate!
    );
  }

  if (!isFirstSync && !newSeasonDetected && !dailyCheckDue && !claimDetected) {
    logger.info(
      `syncBalances ${username}: skipping (last run ${metaState.lastSyncedCreatedDate?.toISOString()})`
    );
    return;
  }

  const trigger = isFirstSync
    ? "first-sync"
    : newSeasonDetected
      ? `new-season-${latestCompletedSeason!.id}`
      : dailyCheckDue
        ? "daily-refresh"
        : "claim-detected";
  logger.info(`syncBalances ${username}: running (trigger=${trigger})`);

  for (const tokenType of BALANCE_HISTORY_TOKEN_TYPES) {
    if (shouldShutdown()) return;
    await syncBalancesForToken(username, tokenDecrypted, tokenType, allSeasons);
  }

  // Checkpoint lastSeasonProcessed as soon as the token syncs are done.
  // This prevents "lastSeasonProcessed = 0" persisting across restarts when
  // the worker is interrupted before or during syncUnclaimedBalances, which
  // would cause newSeasonDetected to be permanently true on every cycle.
  if (!shouldShutdown()) {
    await updateSyncState(metaState.id, {
      lastSyncedCreatedDate: now,
      lastSeasonProcessed: latestCompletedSeason?.id ?? metaState.lastSeasonProcessed,
    });
  }

  if (!shouldShutdown()) {
    await syncUnclaimedBalances(username, tokenDecrypted, allSeasons);
  }

  // Mark the full sync complete — only when not interrupted by shutdown.
  if (!shouldShutdown()) {
    await updateSyncState(metaState.id, { status: "completed" });
  }
}
