import { fetchBalanceHistoryPage } from "@/lib/backend/api/spl/spl-api";
import logger from "@/lib/backend/log/logger.server";
import {
  BALANCE_SPILLOVER_TYPES,
  BalanceHistoryTokenType,
  SplBalanceHistoryItem,
} from "@/types/spl/balance";
import { Season } from "@prisma/client";
import { BALANCE_HISTORY_PAGE_LIMIT, REQUEST_DELAY_MS } from "../worker-config";

export interface AggregatedEntry {
  token: string;
  type: string;
  amount: number;
  count: number;
}

export interface IncrementalResult {
  /** Per-season aggregated deltas to increment into the DB. */
  deltas: Map<number, AggregatedEntry[]>;
  /** The max created_date seen — advance the sync cursor to this value (current season only). */
  maxCreatedDate: Date | null;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch balance history items in the window (sinceDate, toDate].
 *
 * The API paginates newest-first starting from toDate (or now if omitted).
 * We stop when items fall at or before sinceDate.
 */
async function fetchItemsInRange(
  username: string,
  tokenType: BalanceHistoryTokenType,
  token: string,
  sinceDate: Date,
  toDate?: Date
): Promise<SplBalanceHistoryItem[]> {
  const all: SplBalanceHistoryItem[] = [];
  let fromDate: string | undefined = toDate?.toISOString();
  let lastUpdateDate: string | undefined;

  while (true) {
    await delay(REQUEST_DELAY_MS);

    const batch = await fetchBalanceHistoryPage(
      username,
      tokenType,
      token,
      fromDate,
      lastUpdateDate,
      BALANCE_HISTORY_PAGE_LIMIT
    );
    if (batch.length === 0) break;

    for (const item of batch) {
      if (new Date(item.created_date) > sinceDate) all.push(item);
    }

    const lastItem = batch[batch.length - 1];
    if (new Date(lastItem.created_date) <= sinceDate) break;
    if (batch.length < BALANCE_HISTORY_PAGE_LIMIT) break;

    fromDate = lastItem.created_date;
    lastUpdateDate = lastItem.last_update_date;
  }

  return all;
}

/**
 * Assign each item to its season bucket using created_date, applying spillover:
 * items whose type is in spilloverTypes land in the *previous* season's bucket.
 */
function routeItemsToSeasons(
  items: SplBalanceHistoryItem[],
  allSeasons: Season[],
  spilloverTypes: readonly string[] | undefined
): Map<number, SplBalanceHistoryItem[]> {
  const sorted = [...allSeasons].sort((a, b) => a.id - b.id);
  // Season covers the half-open range (prevSeason.endsAt, season.endsAt]
  const ranges = sorted.map((s, i) => ({
    id: s.id,
    start: i > 0 ? sorted[i - 1].endsAt : new Date(0),
    end: s.endsAt,
  }));

  const buckets = new Map<number, SplBalanceHistoryItem[]>();

  for (const item of items) {
    const d = new Date(item.created_date);
    const season = ranges.find((r) => d > r.start && d <= r.end);
    if (!season) continue;

    const isSpillover = spilloverTypes?.includes(item.type) ?? false;
    const targetId = isSpillover ? season.id - 1 : season.id;

    if (!buckets.has(targetId)) buckets.set(targetId, []);
    buckets.get(targetId)!.push(item);
  }

  return buckets;
}

function aggregateItems(items: SplBalanceHistoryItem[]): AggregatedEntry[] {
  const map = new Map<string, AggregatedEntry>();
  for (const item of items) {
    const key = `${item.token}:${item.type}`;
    const amount = Number.parseFloat(item.amount);
    const existing = map.get(key);
    if (existing) {
      existing.amount += amount;
      existing.count++;
    } else {
      map.set(key, { token: item.token, type: item.type, amount, count: 1 });
    }
  }
  return Array.from(map.values());
}

/**
 * Fetch one chunk of balance history and return per-season deltas.
 *
 * Fetches items in the range (sinceDate, toDate]. Pass toDate = season.endsAt for
 * season-by-season chunking (initial/catch-up sync), or omit toDate to fetch from
 * sinceDate up to now (current season / incremental update).
 *
 * maxCreatedDate is only meaningful when toDate is omitted (current season), where it
 * becomes the new cursor value. For completed-season chunks the caller uses season.endsAt.
 */
export async function fetchBalanceHistoryDelta(
  username: string,
  tokenType: BalanceHistoryTokenType,
  token: string,
  allSeasons: Season[],
  sinceDate: Date,
  toDate?: Date
): Promise<IncrementalResult> {
  const spilloverTypes = BALANCE_SPILLOVER_TYPES[tokenType];

  const items = await fetchItemsInRange(username, tokenType, token, sinceDate, toDate);
  if (items.length === 0) return { deltas: new Map(), maxCreatedDate: null };

  const maxCreatedDate = items.reduce<Date | null>((max, item) => {
    const d = new Date(item.created_date);
    return max === null || d > max ? d : max;
  }, null);

  const buckets = routeItemsToSeasons(items, allSeasons, spilloverTypes);

  if (spilloverTypes) {
    let spilloverCount = 0;
    for (const [, bucketItems] of buckets) {
      spilloverCount += bucketItems.filter((i) => spilloverTypes.includes(i.type)).length;
    }
    if (spilloverCount > 0) {
      logger.info(`${username}/${tokenType}: ${spilloverCount} spillover items`);
    }
  }

  const deltas = new Map<number, AggregatedEntry[]>();
  for (const [seasonId, seasonItems] of buckets) {
    deltas.set(seasonId, aggregateItems(seasonItems));
  }

  return { deltas, maxCreatedDate };
}
