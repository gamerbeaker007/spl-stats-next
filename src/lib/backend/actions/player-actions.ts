"use server";

import { fetchPlayerHistoryByDateRange } from "@/lib/backend/api/spl/spl-authenticated-api";
import { getDecryptedJwt } from "@/lib/backend/auth/jwt";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import {
  getCachedBrawlDetails,
  getCachedDailyProgress,
  getCachedLandHarvestData,
} from "@/lib/backend/cache/spl-authenticated-cache";
import {
  getCachedPeakmonstersMarketPrices,
  getCachedPlayerPoolBalances,
  getCachedSplCardCollection,
  getCachedSplCardDetails,
  getCachedSplListingPrices,
  getCachedSplPlayerBalances,
  getCachedSplPlayerDetails,
  getCachedSplPlayerDraws,
  getCachedSplSeasonRewards,
} from "@/lib/backend/cache/spl-cache";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getAllSeasons, getLatestSeason, getSeasonById } from "@/lib/backend/db/seasons";
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
import { PlayerPoolBalances } from "@/types/spl/balances";
import { LandHarvestData } from "@/types/land/landHarvest";
import { getCurrentUser, getMonitoredAccounts } from "./auth-actions";

// ---------------------------------------------------------------------------
// Public actions (no token required)
//
// All reads go through the `"use cache"` wrappers in `cache/spl-cache.ts` so
// repeated dashboard mounts and multiple accounts share cached data instead of
// hitting Splinterlands on every render.
// ---------------------------------------------------------------------------

export async function getPlayerDetails(username: string) {
  return getCachedSplPlayerDetails(username);
}

export async function getPlayerBalances(username: string) {
  return getCachedSplPlayerBalances(username);
}

export async function getPlayerDraws(username: string) {
  return getCachedSplPlayerDraws(username);
}

export async function getPlayerSeasonRewards(username: string) {
  return getCachedSplSeasonRewards(username);
}

/** Underlying DEC/SPS held in the player's DEC-SPS liquidity pool positions. */
export async function getPlayerPoolBalances(username: string): Promise<PlayerPoolBalances> {
  return getCachedPlayerPoolBalances(username);
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
  return getCachedBrawlDetails(username, guildId, tournamentId);
}

export async function getPlayersDailyProgress(username: string): Promise<DailyProgressData | null> {
  if (!(await assertMonitorsAccount(username))) return null;
  return getCachedDailyProgress(username);
}

export async function getPlayersCardCollection(
  username: string
): Promise<PlayerCardCollectionData> {
  const [collection, listPrices, marketPrices] = await Promise.all([
    getCachedSplCardCollection(username),
    getCachedSplListingPrices(),
    getCachedPeakmonstersMarketPrices(),
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

// ---------------------------------------------------------------------------
// Force refresh (per account)
// ---------------------------------------------------------------------------

/**
 * Expire every cached dashboard read for a single monitored account so the next
 * fetch goes to Splinterlands. Scoped per account on purpose — refreshing one
 * card must not invalidate the other accounts' cached data.
 *
 * Returns `false` when the caller does not monitor `username`.
 */
export async function forceRefreshDashboardAccount(username: string): Promise<boolean> {
  if (!(await assertMonitorsAccount(username))) return false;
  await revalidateTagsAction([{ type: "dashboard-account", usernames: [username] }]);
  return true;
}

/**
 * Cached land harvest data for the player's monitored account.
 * Returns null when the caller does not monitor `username`.
 */
export async function getPlayerLandHarvest(username: string): Promise<LandHarvestData | null> {
  if (!(await assertMonitorsAccount(username))) return null;
  return getCachedLandHarvestData(username);
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
