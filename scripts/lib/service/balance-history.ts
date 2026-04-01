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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getSeasonDateRange(
  season: Season,
  seasons: Season[]
): { startDate: Date; endDate: Date } {
  const idx = seasons.findIndex((s) => s.id === season.id);
  const startDate = idx > 0 ? seasons[idx - 1].endsAt : new Date(0);
  return { startDate, endDate: season.endsAt };
}

async function fetchBalanceHistoryByDateRange(
  username: string,
  tokenType: BalanceHistoryTokenType,
  token: string,
  startDate: Date,
  endDate: Date
): Promise<SplBalanceHistoryItem[]> {
  const allEntries: SplBalanceHistoryItem[] = [];
  let fromDate: string | undefined = endDate.toISOString();
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

    allEntries.push(
      ...batch.filter((item) => {
        const d = new Date(item.created_date);
        return d >= startDate && d <= endDate;
      })
    );

    const lastItem = batch[batch.length - 1];
    fromDate = lastItem.created_date;
    lastUpdateDate = lastItem.last_update_date;

    if (new Date(lastItem.created_date) < startDate) break;
    if (batch.length < BALANCE_HISTORY_PAGE_LIMIT) break;
  }

  return allEntries;
}

function aggregateBalanceItems(items: SplBalanceHistoryItem[]): AggregatedEntry[] {
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
 * Fetch and aggregate all balance history for a single token/season combination.
 * Handles spillover: types that arrive in the next season's window but belong here.
 */
export async function syncBalanceTokenForSeason(
  username: string,
  token: string,
  tokenType: BalanceHistoryTokenType,
  season: Season,
  seasons: Season[],
  currentSeasonId: number
): Promise<AggregatedEntry[]> {
  const { startDate, endDate } = getSeasonDateRange(season, seasons);
  const spilloverTypes = BALANCE_SPILLOVER_TYPES[tokenType];

  const rawItems = await fetchBalanceHistoryByDateRange(
    username,
    tokenType,
    token,
    startDate,
    endDate
  );

  // Exclude spillover types from the main window — they belong to the previous season
  const items = spilloverTypes
    ? rawItems.filter((item) => !spilloverTypes.includes(item.type))
    : rawItems;

  // Pull spillover from the next season's window (completed seasons only)
  if (spilloverTypes && season.id < currentSeasonId) {
    const nextSeason = seasons.find((s) => s.id === season.id + 1);
    if (nextSeason) {
      const spilloverItems = await fetchBalanceHistoryByDateRange(
        username,
        tokenType,
        token,
        endDate,
        nextSeason.endsAt
      );
      const filtered = spilloverItems.filter((item) => spilloverTypes.includes(item.type));
      items.push(...filtered);
      if (filtered.length > 0) {
        logger.info(
          `${username}/${tokenType}/S${season.id}: ${filtered.length} spillover items from next season`
        );
      }
    }
  }

  return aggregateBalanceItems(items);
}
