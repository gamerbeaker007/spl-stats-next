import { fetchUnclaimedBalanceHistoryPage } from "@/lib/backend/api/spl/spl-api";
import logger from "@/lib/backend/log/logger.server";
import {
  SplUnclaimedBalanceHistoryItem,
  UNCLAIMED_SPILLOVER_TYPES,
  UNCLAIMED_TOKEN_TYPES,
} from "@/types/spl/balance";
import { Season } from "@prisma/client";
import { AggregatedEntry, getSeasonDateRange } from "./balance-history";
import { BALANCE_HISTORY_PAGE_LIMIT, REQUEST_DELAY_MS } from "../worker-config";

/** Unclaimed balance history only exists from this season onwards. */
export const UNCLAIMED_MIN_SEASON = 93;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function aggregateUnclaimedItems(items: SplUnclaimedBalanceHistoryItem[]): AggregatedEntry[] {
  const map = new Map<string, AggregatedEntry>();
  for (const item of items) {
    const amount = Number.parseFloat(item.amount);
    // Positive values are temporary — ignore them
    if (amount >= 0) continue;

    const token = `UNCLAIMED_${item.token}`;
    const toSelf = item.to_player === item.player;
    const typeKey = toSelf ? item.type : `${item.type}_to_${item.to_player}`;
    const key = `${token}:${typeKey}`;
    // Negative to self = earned (credit), negative to other = spent (delegation)
    const effectiveAmount = toSelf ? Math.abs(amount) : amount;

    const existing = map.get(key);
    if (existing) {
      existing.amount += effectiveAmount;
      existing.count++;
    } else {
      map.set(key, { token, type: typeKey, amount: effectiveAmount, count: 1 });
    }
  }
  return Array.from(map.values());
}

const isSpilloverType = (type: string): boolean =>
  UNCLAIMED_SPILLOVER_TYPES.includes(type as (typeof UNCLAIMED_SPILLOVER_TYPES)[number]);

/**
 * Fetch all unclaimed balance history pages in a single pass, stopping once
 * items older than `oldestStartDate` are reached.
 *
 * The API uses ID-based (not date-based) pagination, so fetching per-season would
 * restart from the top each time — O(n²) for full scans. One pass is O(n).
 */
async function fetchAllUnclaimedHistory(
  username: string,
  token: string,
  oldestStartDate: Date
): Promise<SplUnclaimedBalanceHistoryItem[]> {
  const all: SplUnclaimedBalanceHistoryItem[] = [];
  let offset: string | undefined;

  while (true) {
    await delay(REQUEST_DELAY_MS);

    const batch = await fetchUnclaimedBalanceHistoryPage(
      username,
      [...UNCLAIMED_TOKEN_TYPES],
      token,
      offset,
      BALANCE_HISTORY_PAGE_LIMIT
    );
    if (batch.length === 0) break;

    all.push(...batch);

    const lastItem = batch[batch.length - 1];
    offset = lastItem.id;

    if (new Date(lastItem.created_date) < oldestStartDate) break;
    if (batch.length < BALANCE_HISTORY_PAGE_LIMIT) break;
  }

  return all;
}

/**
 * Fetch all unclaimed balance history in one pass, then distribute items across
 * the seasons to process in memory, applying spillover logic.
 *
 * Spillover: "season"-type transactions arrive in the early window of season N+1
 * but were earned in season N. They are detected by type and moved to the N bucket.
 *
 * Returns a Map<seasonId, AggregatedEntry[]> for every season in `seasonsToProcess`.
 */
export async function fetchAndDistributeUnclaimedBySeason(
  username: string,
  token: string,
  allSeasons: Season[],
  seasonsToProcess: Season[]
): Promise<Map<number, AggregatedEntry[]>> {
  // Determine the oldest date we need — start of the earliest season to process
  const oldestSeason = seasonsToProcess[0];
  const { startDate: oldestStartDate } = getSeasonDateRange(oldestSeason, allSeasons);

  const allItems = await fetchAllUnclaimedHistory(username, token, oldestStartDate);

  // Pre-compute date ranges for all known seasons (needed to handle spillover windows)
  const dateRanges = new Map<number, { startDate: Date; endDate: Date }>();
  for (const s of allSeasons) {
    dateRanges.set(s.id, getSeasonDateRange(s, allSeasons));
  }

  // Initialize a bucket for every season we need to write results for
  const buckets = new Map<number, SplUnclaimedBalanceHistoryItem[]>();
  for (const s of seasonsToProcess) {
    buckets.set(s.id, []);
  }

  // Iterate allSeasons descending (API returns newest-first, so most items are in recent seasons)
  const seasonsSortedDesc = [...allSeasons].sort((a, b) => b.id - a.id);

  for (const item of allItems) {
    const itemDate = new Date(item.created_date);

    for (const season of seasonsSortedDesc) {
      const range = dateRanges.get(season.id);
      if (!range) continue;
      if (itemDate <= range.startDate || itemDate > range.endDate) continue;

      if (isSpilloverType(item.type)) {
        // Spillover item: arrives in season N's window but belongs to season N-1
        const prevBucket = buckets.get(season.id - 1);
        if (prevBucket) prevBucket.push(item);
      } else {
        const bucket = buckets.get(season.id);
        if (bucket) bucket.push(item);
      }
      break;
    }
  }

  // Aggregate and log spillover counts per season
  const result = new Map<number, AggregatedEntry[]>();
  for (const [seasonId, items] of buckets) {
    const spilloverCount = items.filter((i) => isSpilloverType(i.type)).length;
    if (spilloverCount > 0) {
      logger.info(`${username}/UNCLAIMED/S${seasonId}: ${spilloverCount} spillover items`);
    }
    result.set(seasonId, aggregateUnclaimedItems(items));
  }

  return result;
}
