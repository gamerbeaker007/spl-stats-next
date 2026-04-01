import { AccountSyncState, Season } from "@prisma/client";
import { fetchPlayerDetails } from "@/lib/backend/api/spl/spl-api";
import { RESCAN_MIN_INTERVAL_MS } from "./worker-config";


async function getPlayerFirstSeasonId(
  username: string,
  allSeasons: Season[]
): Promise<number | undefined> {
  const details = await fetchPlayerDetails(username);
  return allSeasons.find((s) => s.endsAt >= new Date(details.join_date))?.id;
}

/**
 * Build the ordered list of seasons to process for one sync state.
 * Includes the current season unless it was successfully completed within the throttle window.
 */
export async function buildSeasonsToProcess(
  username: string,
  allSeasons: Season[],
  currentSeasonId: number,
  syncState: AccountSyncState,
  minSeasonId = 1 // only used for UNCLAIMED_MIN_SEASON
): Promise<Season[] | undefined> {

  // Step 1 determine if a user has data synced alteady start form there when not determine by first join.
  const startFromSeason =
    syncState.lastSeasonProcessed === 0
      ? await getPlayerFirstSeasonId(username, allSeasons)
      : syncState.lastSeasonProcessed;

  // Not able to determine the first season, return, break flow.
  if (!startFromSeason) return;

  // Step 2 filter seasons based on startFromSeason, currentSeasonId, and minSeasonId
  const result = allSeasons.filter(
    (s) => s.id >= startFromSeason && s.id <= currentSeasonId && s.id >= minSeasonId
  );

  // Step 3 check if current season is missing and add if fresh enough
  // once a day is enough but when new season is added include it)
  if (!result.some((s) => s.id === currentSeasonId) && currentSeasonId >= minSeasonId) {
    const freshEnough =
      syncState.status === "completed" &&
      Date.now() - syncState.updatedAt.getTime() < RESCAN_MIN_INTERVAL_MS;
    if (!freshEnough) {
      const cur = allSeasons.find((s) => s.id === currentSeasonId);
      if (cur) result.push(cur);
    }
  }

  return result;
}
