"use server";

import { fetchPeakmonstersMarketPrices } from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchCardCollection,
  fetchCurrentRewards,
  fetchFrontierDraws,
  fetchListingPrices,
  fetchPlayerBalances,
  fetchPlayerDetails,
  fetchRankedDraws,
} from "@/lib/backend/api/spl/spl-api";
import {
  fetchBrawlDetails,
  fetchDailyProgress,
  fetchPlayerHistoryByDateRange,
} from "@/lib/backend/api/spl/spl-authenticated-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import { getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getAllSeasons, getLatestSeason, getSeasonById } from "@/lib/backend/db/seasons";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import { getPlayerCollectionValue } from "@/lib/collectionUtils";
import {
  aggregatePurchaseRewards,
  aggregateRewards,
  mergeRewardSummaries,
} from "@/lib/rewardAggregator";
import { DetailedPlayerCardCollection } from "@/types/card";
import { ParsedHistory, ParsedPlayerRewardHistory, PurchaseResult } from "@/types/parsedHistory";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { SeasonBalanceHistory, TokenBalanceSummary } from "@/types/spl/balanceHistory";
import { getCurrentUser, getMonitoredAccounts } from "./auth-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getDecryptedJwt(username: string): Promise<string | undefined> {
  const creds = await getSplAccountCredentials(username);
  if (!creds) return undefined;
  return decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
}

// ---------------------------------------------------------------------------
// Public actions (no token required)
// ---------------------------------------------------------------------------

export async function getPlayerDetails(username: string) {
  return fetchPlayerDetails(username);
}

export async function getPlayerBalances(username: string) {
  return fetchPlayerBalances(username);
}

export async function getPlayerDraws(username: string) {
  const [ranked, frontier] = await Promise.all([
    fetchRankedDraws(username),
    fetchFrontierDraws(username),
  ]);
  return { ranked, frontier };
}

export async function getPlayerSeasonRewards(username: string) {
  return fetchCurrentRewards(username);
}

export async function getCardDetails() {
  return getCachedSplCardDetails();
}

// ---------------------------------------------------------------------------
// Actions that use the player's stored token when available
// ---------------------------------------------------------------------------

async function assertMonitorsAccount(username: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const accounts = await getMonitoredAccounts();
  return accounts.some((a) => a.username === username.toLowerCase());
}

export async function getPlayerBrawl(username: string, guildId: string, tournamentId: string) {
  if (!(await assertMonitorsAccount(username))) return null;
  const token = await getDecryptedJwt(username);
  return fetchBrawlDetails(guildId, tournamentId, username, token);
}

export async function getPlayersDailyProgress(username: string): Promise<DailyProgressData | null> {
  if (!(await assertMonitorsAccount(username))) return null;
  const token = await getDecryptedJwt(username);
  if (!token) return null;

  const [modern, wild, foundation] = await Promise.allSettled([
    fetchDailyProgress(username, token, "modern"),
    fetchDailyProgress(username, token, "wild"),
    fetchDailyProgress(username, token, "foundation"),
  ]);

  return {
    username,
    timestamp: new Date().toISOString(),
    format: {
      modern: modern.status === "fulfilled" ? modern.value : undefined,
      wild: wild.status === "fulfilled" ? wild.value : undefined,
      foundation: foundation.status === "fulfilled" ? foundation.value : undefined,
    },
  };
}

export async function getPlayersCardCollection(
  username: string
): Promise<PlayerCardCollectionData> {
  const [collection, listPrices, marketPrices] = await Promise.all([
    fetchCardCollection(username),
    fetchListingPrices(),
    fetchPeakmonstersMarketPrices(),
  ]);
  const playerCollectionValue = await getPlayerCollectionValue(
    collection,
    listPrices,
    marketPrices
  );
  return {
    username,
    date: new Date().toISOString(),
    collectionPower: collection.collection_power,
    playerCollectionValue,
  };
}

export async function getDetailedPlayerCardCollection(
  username: string
): Promise<DetailedPlayerCardCollection> {
  return getDetailedPlayerCardCollectionCached(username);
}

// ---------------------------------------------------------------------------
// Season date lookup (reads from DB)
// ---------------------------------------------------------------------------

export async function getLatestSeasonAction() {
  return getLatestSeason();
}

export async function getAllSeasonsAction() {
  return getAllSeasons();
}

// ---------------------------------------------------------------------------
// Balance summary from DB (reads SeasonBalance table, no API call)
// ---------------------------------------------------------------------------

export async function getSeasonBalanceSummary(
  username: string,
  seasonId: number
): Promise<SeasonBalanceHistory> {
  const rows = await getSeasonBalances(username, seasonId);

  // Group rows by token and aggregate
  const byToken = new Map<string, TokenBalanceSummary>();
  for (const row of rows) {
    if (!byToken.has(row.token)) {
      byToken.set(row.token, {
        token: row.token,
        totalEarned: 0,
        totalSpent: 0,
        net: 0,
        byType: {},
      });
    }
    const entry = byToken.get(row.token)!;
    entry.totalEarned += row.earned;
    entry.totalSpent += row.cost;
    entry.net += row.earned - row.cost;
    entry.byType[row.type] = {
      earned: (entry.byType[row.type]?.earned ?? 0) + row.earned,
      spent: (entry.byType[row.type]?.spent ?? 0) + row.cost,
      count: (entry.byType[row.type]?.count ?? 0) + row.count,
    };
  }

  return { seasonId, summaries: Array.from(byToken.values()) };
}

// ---------------------------------------------------------------------------
// Reward history for a season (API fetch by date range)
// ---------------------------------------------------------------------------

const REWARD_HISTORY_TYPES = "claim_reward,claim_daily,purchase";

export async function getPlayerSeasonHistory(
  username: string,
  seasonId: number
): Promise<ParsedPlayerRewardHistory | null> {
  const [season, prevSeason] = await Promise.all([
    getSeasonById(seasonId),
    getSeasonById(seasonId - 1),
  ]);
  if (!season) return null;
  const endDate = new Date(season.endsAt);
  const startDate = prevSeason ? new Date(prevSeason.endsAt) : new Date(0);

  const token = await getDecryptedJwt(username);
  if (!token) return null;

  const allHistory: ParsedHistory[] = await fetchPlayerHistoryByDateRange(
    username,
    token,
    REWARD_HISTORY_TYPES,
    startDate,
    endDate
  );

  const purchaseEntries = allHistory
    .filter(
      (e): e is ParsedHistory & { type: "purchase"; result: PurchaseResult } =>
        e.type === "purchase" && e.result !== null
    )
    .map((e) => e.result as PurchaseResult);

  const aggregation = mergeRewardSummaries(
    aggregateRewards(allHistory),
    aggregatePurchaseRewards(purchaseEntries)
  );

  return {
    allEntries: allHistory,
    totalEntries: allHistory.length,
    seasonId,
    aggregation,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}
