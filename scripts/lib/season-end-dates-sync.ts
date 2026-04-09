import { fetchSeason } from "@/lib/backend/api/spl/spl-api";
import { getLatestSeason, upsertSeason } from "@/lib/backend/db/seasons";
import logger from "@/lib/backend/log/logger.server";
import { shouldShutdown } from "./graceful-shutdown";
import { REQUEST_DELAY_MS } from "./worker-config";

const BATCH_SIZE = 5;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sync seasons from the SPL API into the database.
 * - On empty DB: fetches all seasons from 1 to currentSeasonId in parallel batches.
 * - On subsequent runs: only fetches seasons newer than the latest in DB.
 */
export async function syncSeasonsEndDates(currentSeasonId: number): Promise<void> {
  logger.info(`Season sync: current season is ${currentSeasonId}`);

  const latestInDb = await getLatestSeason();
  const startFrom = latestInDb ? latestInDb.id + 1 : 1;

  if (startFrom > currentSeasonId) {
    logger.info("Season sync: all seasons up to date");
    return;
  }

  const seasonIds: number[] = [];
  for (let id = startFrom; id <= currentSeasonId; id++) {
    seasonIds.push(id);
  }

  logger.info(`Season sync: fetching ${seasonIds.length} seasons (${startFrom}..${currentSeasonId})`);

  // Fetch in batches to avoid hammering the API
  for (let i = 0; i < seasonIds.length; i += BATCH_SIZE) {
    if (shouldShutdown()) break;

    const batch = seasonIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((id) => fetchSeason(id)));

    for (const season of results) {
      await upsertSeason(season.id, new Date(season.ends));
    }

    if (i + BATCH_SIZE < seasonIds.length) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  logger.info("Season sync: complete");
}
