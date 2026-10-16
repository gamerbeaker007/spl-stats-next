import { fetchUnclaimedBalanceHistoryPage } from "@/lib/backend/api/spl/spl-authenticated-api";
import logger from "@/lib/backend/log/logger.server";
import {
  SplUnclaimedBalanceHistoryItem,
  UNCLAIMED_SPILLOVER_TYPES,
  UNCLAIMED_TOKEN_TYPES,
} from "@/types/spl/balance";
import { Season } from "@prisma/client";
import { AggregatedEntry, IncrementalResult } from "./balance-history";
import { BALANCE_HISTORY_PAGE_LIMIT, REQUEST_DELAY_MS } from "../worker-config";

/** Unclaimed balance history only exists from this season onwards. */
export const UNCLAIMED_MIN_SEASON = 93;

/** Modern rewards spill into the previous season starting with season 192. */
/* This is since modern baracket reward distribution was introduced in season 192. */
export const UNCLAIMED_MODERN_SPILLOVER_MIN_TARGET_SEASON = 192;

interface SeasonRange {
  id: number;
  start: Date;
  end: Date;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isSpilloverType = (type: string, targetSeasonId: number): boolean => {
  if (!UNCLAIMED_SPILLOVER_TYPES.includes(type as (typeof UNCLAIMED_SPILLOVER_TYPES)[number])) {
    return false;
  }
  return (
    type === "season" ||
    (type === "modern" && targetSeasonId >= UNCLAIMED_MODERN_SPILLOVER_MIN_TARGET_SEASON)
  );
};

function getSeasonRanges(allSeasons: Season[]): SeasonRange[] {
  const sorted = [...allSeasons].sort((a, b) => a.id - b.id);
  return sorted.map((season, index) => ({
    id: season.id,
    start: index > 0 ? sorted[index - 1].endsAt : new Date(0),
    end: season.endsAt,
  }));
}

function findSeasonForDate(date: Date, ranges: SeasonRange[]): SeasonRange | undefined {
  return ranges.find((range) => date > range.start && date <= range.end);
}

/**
 * Fetch unclaimed balance history items newer than stopAt (exclusive).
 * The API uses ID-based pagination; we stop when created_date passes the cutoff.
 * When stopAt is null, fetches all pages.
 */
async function fetchItemsSince(
  username: string,
  token: string,
  stopAt: Date | null
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

    for (const item of batch) {
      if (!stopAt || new Date(item.created_date) > stopAt) {
        all.push(item);
      }
    }

    const lastItem = batch[batch.length - 1];
    if (stopAt && new Date(lastItem.created_date) <= stopAt) break;
    if (batch.length < BALANCE_HISTORY_PAGE_LIMIT) break;

    offset = lastItem.id;
  }

  return all;
}

/**
 * Assign each unclaimed item to its season bucket using created_date, applying spillover:
 * "season"-type items always spill to season N-1; "modern" items do so only when the
 * destination season is at least UNCLAIMED_MODERN_SPILLOVER_MIN_TARGET_SEASON.
 */
function routeItemsToSeasons(
  items: SplUnclaimedBalanceHistoryItem[],
  ranges: SeasonRange[]
): Map<number, SplUnclaimedBalanceHistoryItem[]> {
  const buckets = new Map<number, SplUnclaimedBalanceHistoryItem[]>();

  for (const item of items) {
    const d = new Date(item.created_date);
    const season = findSeasonForDate(d, ranges);
    if (!season) continue;

    const previousSeasonId = season.id - 1;
    const targetId = isSpilloverType(item.type, previousSeasonId) ? previousSeasonId : season.id;
    if (!buckets.has(targetId)) buckets.set(targetId, []);
    buckets.get(targetId)!.push(item);
  }

  return buckets;
}

function aggregateItems(items: SplUnclaimedBalanceHistoryItem[]): AggregatedEntry[] {
  const map = new Map<string, AggregatedEntry>();
  for (const item of items) {
    const amount = Number.parseFloat(item.amount);
    // Positive values are temporary — ignore them
    if (amount >= 0) continue;

    const token = `UNCLAIMED_${item.token}`;
    const toSelf = item.to_player === item.player;
    // Use base type as key — delegation target stored in meta, not encoded in type
    const key = `${token}:${item.type}`;
    const abs = Math.abs(amount);

    const existing = map.get(key);
    if (existing) {
      // Negative to self = earned (credit); negative to other = cost (delegation)
      if (toSelf) existing.earned += abs;
      else existing.cost += abs;
      existing.count++;
    } else {
      map.set(key, {
        token,
        type: item.type,
        earned: toSelf ? abs : 0,
        cost: toSelf ? 0 : abs,
        count: 1,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Fetch all unclaimed balance history newer than sinceDate and return per-season deltas.
 *
 * - sinceDate = null  →  initial full scan; oldestDate is the lower bound
 *                        (start of UNCLAIMED_MIN_SEASON to avoid fetching pre-history).
 * - sinceDate = Date  →  incremental: only items created after that date.
 */
export async function fetchIncrementalUnclaimedHistory(
  username: string,
  token: string,
  allSeasons: Season[],
  sinceDate: Date | null,
  oldestDate: Date | null
): Promise<IncrementalResult> {
  const stopAt = sinceDate ?? oldestDate;

  const items = await fetchItemsSince(username, token, stopAt);
  if (items.length === 0) return { deltas: new Map(), maxCreatedDate: null };

  const maxCreatedDate = items.reduce<Date | null>((max, item) => {
    const d = new Date(item.created_date);
    return max === null || d > max ? d : max;
  }, null);

  const seasonRanges = getSeasonRanges(allSeasons);
  const buckets = routeItemsToSeasons(items, seasonRanges);

  for (const [seasonId, bucketItems] of buckets) {
    const spilloverCount = bucketItems.filter((item) => {
      const sourceSeason = findSeasonForDate(new Date(item.created_date), seasonRanges);
      return sourceSeason !== undefined && isSpilloverType(item.type, sourceSeason.id - 1);
    }).length;
    if (spilloverCount > 0) {
      logger.info(`${username}/UNCLAIMED/S${seasonId}: ${spilloverCount} spillover items`);
    }
  }

  const deltas = new Map<number, AggregatedEntry[]>();
  for (const [seasonId, seasonItems] of buckets) {
    deltas.set(seasonId, aggregateItems(seasonItems));
  }

  return { deltas, maxCreatedDate };
}
