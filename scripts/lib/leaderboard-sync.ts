import { fetchLeaderboardWithPlayer } from "@/lib/backend/api/spl/spl-api";
import { getOrCreateSyncState, updateSyncState } from "@/lib/backend/db/account-sync-states";
import { upsertPlayerLeaderboard } from "@/lib/backend/db/player-leaderboard";
import logger from "@/lib/backend/log/logger.server";
import { LEADERBOARD_FORMATS, SplFormats } from "@/types/spl/leaderboard";
import { shouldShutdown } from "./graceful-shutdown";
import { REQUEST_DELAY_MS } from "./worker-config";
import { AccountSyncState, Season } from "@prisma/client";
import { getPlayerFirstSeasonId } from "./sync-utils";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function syncKeyForFormat(format: SplFormats): string {
  return `LEADERBOARD_${format.toUpperCase()}`;
}

/**
 * Sync leaderboard rankings for one account across all formats (foundation, wild, modern).
 * - First run (lastSeasonProcessed === 0): fetches all seasons.
 * - Subsequent runs: fetches only seasons not yet processed.
 */
export async function syncLeaderboard(
  username: string,
  allSeasons: Season[],
  currentSeasonId: number
): Promise<void> {
  for (const format of LEADERBOARD_FORMATS) {
    if (shouldShutdown()) return;

    const syncState = await getOrCreateSyncState(username, syncKeyForFormat(format));

    const seasonToProcess = await buildSeasonsToProcess(
      username,
      allSeasons,
      currentSeasonId,
      syncState
    );

    if (!seasonToProcess || seasonToProcess.length === 0) continue;

    await updateSyncState(syncState.id, { status: "processing" });

    try {
      for (const season of seasonToProcess) {
        if (shouldShutdown()) return;
        const player = await fetchLeaderboardWithPlayer(username, season.id, format);
        // Skip stub entries — API returns { player: username } with no stats when
        // the account did not participate in this format/season.
        if (player?.battles != null) {
          logger.info(`Processing season ${season.id} for ${username} in format ${format}`);
          await upsertPlayerLeaderboard({
            username,
            seasonId: season.id,
            format,
            rating: player.rating ?? null,
            rank: player.rank ?? null,
            battles: player.battles ?? null,
            wins: player.wins ?? null,
            longestStreak: player.longest_streak ?? null,
            maxRating: player.max_rating ?? null,
            league: player.league ?? null,
            maxLeague: player.max_league ?? null,
            rshares: player.rshares ?? null,
          });
        }

        await updateSyncState(syncState.id, { lastSeasonProcessed: season.id });
        await delay(REQUEST_DELAY_MS);
      }

      await updateSyncState(syncState.id, { status: "completed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`syncLeaderboard ${username}/${format}: ${msg}`);
      await updateSyncState(syncState.id, { status: "failed", errorMessage: msg });
    }
  }
}

/**
 * Build the ordered list of seasons to process for one sync state.
 * Only processes historical seasons (strictly before currentSeasonId).
 * Skips seasons already recorded in lastSeasonProcessed.
 */
async function buildSeasonsToProcess(
  username: string,
  allSeasons: Season[],
  currentSeasonId: number,
  syncState: AccountSyncState
): Promise<Season[] | undefined> {
  const lastProcessed = syncState.lastSeasonProcessed;

  if (lastProcessed === 0) {
    // First run: determine join season and process from there
    const firstSeasonId = await getPlayerFirstSeasonId(username, allSeasons);
    if (!firstSeasonId) return undefined;

    return allSeasons
      .filter((s) => s.id >= firstSeasonId && s.id < currentSeasonId)
      .sort((a, b) => a.id - b.id);
  }

  // Subsequent runs: only seasons after the last processed one (strictly greater)
  const pending = allSeasons
    .filter((s) => s.id > lastProcessed && s.id < currentSeasonId)
    .sort((a, b) => a.id - b.id);

  return pending.length > 0 ? pending : undefined;
}
