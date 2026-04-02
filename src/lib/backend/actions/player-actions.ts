"use server";

import { fetchPeakmonstersMarketPrices } from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchBrawlDetails,
  fetchCardCollection,
  fetchCardDetails,
  fetchCurrentRewards,
  fetchDailyProgress,
  fetchFrontierDraws,
  fetchListingPrices,
  fetchPlayerBalances,
  fetchPlayerDetails,
  fetchPlayerHistory,
  fetchPlayerHistoryByDateRange,
  fetchRankedDraws,
} from "@/lib/backend/api/spl/spl-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getAllSeasons, getLatestSeason, getSeasonById } from "@/lib/backend/db/seasons";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";
import { getCardImg, getPlayerCollectionValue } from "@/lib/collectionUtils";
import {
  CardDetail,
  CardElement,
  CardFoil,
  CardRarity,
  CardRole,
  DetailedPlayerCardCollection,
  DetailedPlayerCardCollectionItem,
} from "@/types/card";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { SeasonBalanceHistory, TokenBalanceSummary } from "@/types/spl/balanceHistory";
import {
  aggregatePurchaseRewards,
  aggregateRewards,
  mergeRewardSummaries,
} from "@/lib/rewardAggregator";
import { ParsedHistory, ParsedPlayerRewardHistory, PurchaseResult } from "@/types/parsedHistory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getDecryptedToken(username: string): Promise<string | undefined> {
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
  return fetchCardDetails();
}

export async function getListingPrices() {
  return fetchListingPrices();
}

export async function getPeakmonstersMarketPrices() {
  return fetchPeakmonstersMarketPrices();
}

// ---------------------------------------------------------------------------
// Actions that use the player's stored token when available
// ---------------------------------------------------------------------------

export async function getPlayerBrawl(username: string, guildId: string, tournamentId: string) {
  const token = await getDecryptedToken(username);
  return fetchBrawlDetails(guildId, tournamentId, username, token);
}

export async function getPlayersDailyProgress(username: string): Promise<DailyProgressData | null> {
  const token = await getDecryptedToken(username);
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

const FOIL_MAP: CardFoil[] = ["regular", "gold", "gold arcane", "black", "black arcane"];
const RARITY_MAP: CardRarity[] = ["common", "rare", "epic", "legendary"];

export async function getDetailedPlayerCardCollection(
  username: string
): Promise<DetailedPlayerCardCollection> {
  const [collection, cardDetails] = await Promise.all([
    fetchCardCollection(username),
    fetchCardDetails(),
  ]);

  const detailedMap: DetailedPlayerCardCollection = {};

  for (const detail of cardDetails) {
    const rarity: CardRarity = RARITY_MAP[detail.rarity - 1] ?? "common";
    const color = (detail.color?.toLowerCase() ?? "gray") as CardElement;
    const secondaryColor = detail.secondary_color
      ? (detail.secondary_color.toLowerCase() as CardElement)
      : undefined;
    const role: CardRole = detail.type === "Summoner" ? "archon" : "unit";
    const edition = detail.distribution?.[0]?.edition ?? 0;

    const item: DetailedPlayerCardCollectionItem = {
      cardDetailId: detail.id,
      name: detail.name,
      edition,
      tier: detail.tier,
      rarity,
      color,
      secondaryColor,
      role,
      allCards: [],
    };

    detailedMap[String(detail.id)] = item;
  }

  for (const playerCard of collection.cards) {
    const key = String(playerCard.card_detail_id);
    const item = detailedMap[key];
    if (!item) continue;

    const foil: CardFoil = FOIL_MAP[playerCard.foil] ?? "regular";
    const cardDetail: CardDetail = {
      id: playerCard.card_detail_id,
      uid: playerCard.uid,
      name: playerCard.display_name,
      owner: playerCard.player,
      xp: playerCard.xp,
      edition: playerCard.edition,
      cardSet: playerCard.card_set,
      collectionPower: playerCard.collection_power,
      bcx: playerCard.bcx,
      setId: playerCard.set_id,
      bcxUnbound: playerCard.bcx_unbound,
      foil,
      mint: playerCard.mint,
      level: playerCard.level,
      imgUrl: getCardImg(item.name, playerCard.edition, foil, playerCard.level),
    };

    item.allCards!.push(cardDetail);

    if (!item.highestLevelCard || cardDetail.level > item.highestLevelCard.level) {
      item.highestLevelCard = cardDetail;
    }
  }

  return detailedMap;
}

// ---------------------------------------------------------------------------
// Reward / purchase history (requires token)
// ---------------------------------------------------------------------------

export async function getPlayerHistory(username: string, types: string, beforeBlock?: number) {
  const token = await getDecryptedToken(username);
  if (!token) return [];
  return fetchPlayerHistory(username, token, types, beforeBlock);
}

export async function getPlayerHistoryByDateRange(
  username: string,
  types: string,
  startDate: Date,
  endDate: Date
) {
  const token = await getDecryptedToken(username);
  if (!token) return [];
  return fetchPlayerHistoryByDateRange(username, token, types, startDate, endDate);
}

// ---------------------------------------------------------------------------
// Season date lookup (reads from DB)
// ---------------------------------------------------------------------------

export async function getSeasonDates(seasonId: number) {
  return getSeasonById(seasonId);
}

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
    const earned = row.amount > 0 ? row.amount : 0;
    const spent = row.amount < 0 ? Math.abs(row.amount) : 0;
    entry.totalEarned += earned;
    entry.totalSpent += spent;
    entry.net += row.amount;
    entry.byType[row.type] = {
      earned: (entry.byType[row.type]?.earned ?? 0) + earned,
      spent: (entry.byType[row.type]?.spent ?? 0) + spent,
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

  const token = await getDecryptedToken(username);
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
