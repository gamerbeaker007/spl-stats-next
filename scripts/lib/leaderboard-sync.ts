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
 * Includes the current season unless it was successfully completed within the throttle window.
 */
async function buildSeasonsToProcess(
  username: string,
  allSeasons: Season[],
  currentSeasonId: number,
  syncState: AccountSyncState,
): Promise<Season[] | undefined> {

  // Step 1 determine if a user has data synced already start form there when not determine by first join.
  const startFromSeason =
    syncState.lastSeasonProcessed === 0
      ? await getPlayerFirstSeasonId(username, allSeasons)
      : syncState.lastSeasonProcessed;

  // Not able to determine the first season, return, break flow.
  if (!startFromSeason) return;

  //Step 2 Check if previous season is already processed
  if (startFromSeason <= syncState.lastSeasonProcessed - 1) return;

  // Step 3: filter completed historical seasons (strictly before the current season).
  // The current season is excluded here so step 3 can apply throttling to it independently.
  return allSeasons.filter(
    (s) => s.id >= startFromSeason && s.id < currentSeasonId && s.id
  );
}
