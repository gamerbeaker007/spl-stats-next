import logger from "@/lib/backend/log/logger.server";
import { SplCAGoldReward } from "@/types/jackpot-prizes/cardCollection";
import { CardHistoryResponse } from "@/types/jackpot-prizes/cardHistory";
import { PackJackpotCard } from "@/types/jackpot-prizes/packJackpot";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";
import { MintHistoryByDateItem, MintHistoryResponse } from "@/types/jackpot-prizes/shared";
import {
  ClaimDailyData,
  ClaimDailyResult,
  ClaimDailyResultReward,
  ClaimLeagueRewardData,
  ClaimLeagueRewardResult,
  ParsedHistory,
  PurchaseData,
  PurchaseResult,
  purchaseTypes,
  RankedDrawEntry,
  RewardDraw,
  RewardMerits,
} from "@/types/parsedHistory";
import { SplLoginResponse } from "@/types/spl/auth";
import {
  BalanceHistoryTokenType,
  SplBalanceHistoryItem,
  SplBalanceHistoryResponse,
  SplUnclaimedBalanceHistoryItem,
  UnclaimedTokenType,
} from "@/types/spl/balance";
import { SplBalance } from "@/types/spl/balances";
import { BATTLE_FORMATS, SplBattle, SplBattleHistoryResponse } from "@/types/spl/battle";
import { SplBrawlDetails } from "@/types/spl/brawl";
import { SplCardCollection } from "@/types/spl/card";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { SplDailyProgress } from "@/types/spl/dailies";
import { SplPlayerDetails } from "@/types/spl/details";
import { SplFrontierDrawStatus, SplRankedDrawStatus } from "@/types/spl/draws";
import { SplFormat } from "@/types/spl/format";
import { SplHistory } from "@/types/spl/history";
import {
  SplInventoryItem,
  SplPlayerCardDetail,
  SplPlayerCollection,
  SplSkin,
} from "@/types/spl/jackpot";
import { SplFormats, SplLeaderboardPlayer, SplLeaderboardResponse } from "@/types/spl/leaderboard";
import { SplCardListingPriceEntry } from "@/types/spl/market";
import { SplSeasonInfo, SplSettings } from "@/types/spl/season";
import { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import axios, { AxiosResponse } from "axios";
import * as rax from "retry-axios";

const SPL_BASE_URL = "https://api2.splinterlands.com/";

const splBaseClient = axios.create({
  baseURL: SPL_BASE_URL,
  timeout: 60000,
  headers: {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": "SPL-Data/1.0",
  },
});

rax.attach(splBaseClient);
splBaseClient.defaults.raxConfig = {
  retry: 10,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
  onRetryAttempt: async (err) => {
    const cfg = rax.getConfig(err);
    logger.warn(`Retry attempt #${cfg?.currentRetryAttempt}`);
  },
};

/**
 * Verifies a SPL token by attempting to fetch balance history.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifySplToken(username: string, token: string): Promise<boolean> {
  try {
    const url = "/players/balance_history";
    const params = { limit: 1, offset: 0, username, token_type: "SPS", token };

    const response: AxiosResponse<SplBalanceHistoryResponse> = await splBaseClient.get(url, {
      params,
    });
    const data = response.data;
    if (Array.isArray(data)) return true;
    if (data && typeof data === "object" && "error" in data) return false;
    return false;
  } catch {
    return false;
  }
}

/**
 * Login to Splinterlands using Hive Keychain signature
 * @param username - Splinterlands username
 * @param timestamp - Unix timestamp in milliseconds
 * @param signature - Signature from Hive Keychain
 * @returns Login response with token and JWT
 */
export async function splLogin(
  username: string,
  timestamp: number,
  signature: string
): Promise<SplLoginResponse> {
  const url = "players/v2/login";

  logger.info(`splLogin called for user: ${username}`);
  const params = {
    name: username,
    ts: timestamp,
    sig: signature,
  };

  try {
    const response = await splBaseClient.get(url, { params });

    if (response.status === 200 && response.data) {
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data as SplLoginResponse;
    } else {
      throw new Error("Login request failed");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === "object" && "error" in errorData) {
        throw new Error(errorData.error as string);
      }
      throw new Error(error.message || "Network error occurred");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Season & Settings
// ---------------------------------------------------------------------------

/** Fetch the current active season from /settings. */
export async function fetchSettings(): Promise<SplSettings> {
  try {
    const res = await splBaseClient.get("/settings");
    return res.data as SplSettings;
  } catch (error) {
    logger.error(
      `Failed to fetch settings: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/** Fetch season info by id from /season?id=N. */
export async function fetchSeason(seasonId: number): Promise<SplSeasonInfo> {
  try {
    const res = await splBaseClient.get("/season", { params: { id: seasonId } });
    return res.data as SplSeasonInfo;
  } catch (error) {
    logger.error(
      `Failed to fetch season ${seasonId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Player Details
// ---------------------------------------------------------------------------

/** Fetch full player details (includes season, guild, league info) from /players/details. */
export async function fetchPlayerDetails(username: string): Promise<SplPlayerDetails> {
  try {
    const res = await splBaseClient.get("/players/details", {
      params: { name: username, season_details: true, format: "all" },
    });
    return res.data as SplPlayerDetails;
  } catch (error) {
    logger.error(
      `Failed to fetch player details for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Balance History (authenticated) — single-page API calls only
// ---------------------------------------------------------------------------

/** Fetch a single page of /players/balance_history using dual-cursor pagination. */
export async function fetchBalanceHistoryPage(
  username: string,
  tokenType: BalanceHistoryTokenType,
  token: string,
  fromDate?: string,
  lastUpdateDate?: string,
  limit: number = 1000
): Promise<SplBalanceHistoryItem[]> {
  const params: Record<string, string | number> = {
    username,
    token_type: tokenType,
    limit,
    token,
  };
  if (fromDate) params.from = fromDate;
  if (lastUpdateDate) params.last_update_date = lastUpdateDate;

  try {
    const res = await splBaseClient.get("/players/balance_history", {
      params,
    });
    if (!res.data || !Array.isArray(res.data)) return [];
    return res.data as SplBalanceHistoryItem[];
  } catch (error) {
    logger.error(
      `Failed to fetch balance history ${username}/${tokenType}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Unclaimed Balance History (authenticated) — single-page API calls only
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Leaderboard (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch the player's leaderboard entry for a given season and format. Returns null if not ranked. */
export async function fetchLeaderboardWithPlayer(
  username: string,
  season: number,
  format: SplFormats
): Promise<SplLeaderboardPlayer | null> {
  try {
    const res = await splBaseClient.get("/players/leaderboard_with_player", {
      params: { season, format, username },
    });
    const data = res.data as SplLeaderboardResponse;
    return data?.player ?? null;
  } catch (error) {
    logger.error(
      `Failed to fetch leaderboard ${username}/${format}/season${season}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/** Fetch a single page of /players/unclaimed_balance_history using id-based offset. */
export async function fetchUnclaimedBalanceHistoryPage(
  username: string,
  tokenTypes: UnclaimedTokenType[],
  token: string,
  offset?: string,
  limit: number = 1000
): Promise<SplUnclaimedBalanceHistoryItem[]> {
  const params: Record<string, string | number> = {
    username,
    token_type: tokenTypes.join(","),
    limit,
    token,
  };
  if (offset) params.offset = offset;

  try {
    const res = await splBaseClient.get("/players/unclaimed_balance_history", {
      params,
    });
    if (!res.data || !Array.isArray(res.data)) return [];
    return res.data as SplUnclaimedBalanceHistoryItem[];
  } catch (error) {
    logger.error(
      `Failed to fetch unclaimed balance history for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Player Balances (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch all balances for a player from /players/balances. */
export async function fetchPlayerBalances(username: string): Promise<SplBalance[]> {
  try {
    const res = await splBaseClient.get("/players/balances", { params: { username } });
    if (!res.data || !Array.isArray(res.data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }
    return res.data as SplBalance[];
  } catch (error) {
    logger.error(
      `Failed to fetch player balances for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Draws (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch ranked draw status for a player. */
export async function fetchRankedDraws(username: string): Promise<SplRankedDrawStatus> {
  try {
    const res = await splBaseClient.get("/ranked_draws/status", { params: { username } });
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplRankedDrawStatus;
  } catch (error) {
    logger.error(
      `Failed to fetch ranked draws for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/** Fetch frontier draw status for a player. */
export async function fetchFrontierDraws(username: string): Promise<SplFrontierDrawStatus> {
  try {
    const res = await splBaseClient.get("/frontier_draws/status", { params: { username } });
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplFrontierDrawStatus;
  } catch (error) {
    logger.error(
      `Failed to fetch frontier draws for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Brawl (optionally authenticated via token query param)
// ---------------------------------------------------------------------------

/** Fetch brawl details for a guild/tournament. Pass token to access private data. */
export async function fetchBrawlDetails(
  guildId: string,
  tournamentId: string,
  player: string,
  token?: string
): Promise<SplBrawlDetails> {
  const params: Record<string, string> = {
    guild_id: guildId,
    id: tournamentId,
    username: player,
    ...(token ? { token } : {}),
  };
  try {
    const res = await splBaseClient.get("/tournaments/find_brawl", { params });
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplBrawlDetails;
  } catch (error) {
    logger.error(
      `Failed to fetch brawl details for ${player}/${guildId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Cards (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch a player's card collection from /cards/collection/<username>. */
export async function fetchCardCollection(username: string): Promise<SplCardCollection> {
  try {
    const res = await splBaseClient.get(`/cards/collection/${encodeURIComponent(username)}`);
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplCardCollection;
  } catch (error) {
    logger.error(
      `Failed to fetch card collection for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/** Fetch all card details from /cards/get_details. */
export async function fetchCardDetails(): Promise<SplCardDetail[]> {
  try {
    const res = await splBaseClient.get("/cards/get_details");
    if (!res.data || !Array.isArray(res.data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }
    return res.data as SplCardDetail[];
  } catch (error) {
    logger.error(
      `Failed to fetch card details: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch battle history for an account across all supported formats
 * (wild, modern, foundation, survival) and return a deduplicated list.
 * Authenticated — requires the player's token.
 * Limit per format: 50 (SPL API cap).
 */
export async function fetchBattleHistory(
  player: string,
  token: string,
  limit = 50
): Promise<SplBattle[]> {
  const seen = new Set<string>();
  const battles: SplBattle[] = [];

  for (const format of BATTLE_FORMATS) {
    try {
      const params: Record<string, string | number> = {
        player,
        username: player,
        token,
        limit,
        // wild uses no format param — the API returns wild when omitted
        ...(format !== "wild" ? { format } : {}),
      };
      const res = await splBaseClient.get<SplBattleHistoryResponse>("/battle/history2", {
        params,
      });
      const list = res.data?.battles;
      if (!Array.isArray(list)) continue;

      for (const b of list) {
        if (!seen.has(b.battle_queue_id_1)) {
          seen.add(b.battle_queue_id_1);
          battles.push(b);
        }
      }
    } catch (error) {
      // Log but continue with other formats
      logger.warn(
        `fetchBattleHistory: format=${format} player=${player}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return battles;
}

// ---------------------------------------------------------------------------
// Daily Progress (authenticated via token query param)
// ---------------------------------------------------------------------------

/** Fetch daily quest/focus progress. Token is passed as query param. */
export async function fetchDailyProgress(
  player: string,
  token: string,
  format: SplFormat
): Promise<SplDailyProgress> {
  try {
    const res = await splBaseClient.get("/dailies/progress", {
      params: { username: player, token, format },
    });
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplDailyProgress;
  } catch (error) {
    logger.error(
      `Failed to fetch daily progress for ${player}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Season Rewards (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch current season reward info for a player. */
export async function fetchCurrentRewards(username: string): Promise<SPLSeasonRewards> {
  try {
    const res = await splBaseClient.get("/players/current_rewards", { params: { username } });
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SPLSeasonRewards;
  } catch (error) {
    logger.error(
      `Failed to fetch current rewards for ${username}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Market (public — no token required)
// ---------------------------------------------------------------------------

/** Fetch grouped market listing prices from /market/for_sale_grouped. */
export async function fetchListingPrices(): Promise<SplCardListingPriceEntry[]> {
  try {
    const res = await splBaseClient.get("/market/for_sale_grouped");
    if (!res.data) throw new Error("Invalid response from Splinterlands API");
    return res.data as SplCardListingPriceEntry[];
  } catch (error) {
    logger.error(
      `Failed to fetch listing prices: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Player History (authenticated via token query param)
// ---------------------------------------------------------------------------

const VALID_PURCHASE_TYPES: purchaseTypes[] = [
  "reward_merits",
  "reward_draw",
  "ranked_draw_entry",
  "potion",
  "unbind_scroll",
];

const HISTORY_PAGE_LIMIT = 500;
const HISTORY_PAGE_DELAY_MS = 100;

function parseHistoryToInternalTypes(entry: SplHistory): ParsedHistory | null {
  try {
    let parsedData: ClaimLeagueRewardData | ClaimDailyData | PurchaseData;
    let parsedResult: ClaimLeagueRewardResult | ClaimDailyResult | PurchaseResult | null = null;

    if (entry.type === "claim_reward") {
      parsedData = JSON.parse(entry.data) as ClaimLeagueRewardData;
      if (entry.result) parsedResult = JSON.parse(entry.result) as ClaimLeagueRewardResult;
    } else if (entry.type === "claim_daily") {
      parsedData = JSON.parse(entry.data) as ClaimDailyData;
      if (entry.result) {
        parsedResult = JSON.parse(entry.result) as ClaimDailyResult;
        parsedResult.quest_data.rewards = JSON.parse(
          parsedResult.quest_data.rewards as unknown as string
        ) as ClaimDailyResultReward;
      }
    } else if (entry.type === "purchase") {
      parsedData = JSON.parse(entry.data) as PurchaseData;
      if (!VALID_PURCHASE_TYPES.includes(parsedData.type)) return null;
      if (entry.result) {
        parsedResult = JSON.parse(entry.result) as PurchaseResult;
        parsedResult.data = JSON.parse(parsedResult.data as unknown as string) as
          | RankedDrawEntry
          | RewardMerits
          | RewardDraw;
      }
    } else {
      return null;
    }

    if (!parsedResult) return null;

    return {
      id: entry.id,
      block_id: entry.block_id,
      prev_block_id: entry.prev_block_id,
      type: entry.type as "claim_daily" | "claim_reward" | "purchase",
      player: entry.player,
      affected_player: entry.affected_player,
      data: parsedData,
      success: entry.success,
      error: entry.error,
      block_num: entry.block_num,
      created_date: entry.created_date,
      result: parsedResult,
      steem_price: entry.steem_price,
      sbd_price: entry.sbd_price,
      is_owner: entry.is_owner,
    };
  } catch (error) {
    logger.error(`Failed to parse history entry ${entry.id}: ${error}`);
    return null;
  }
}

/**
 * Fetch a page of player history. Token is passed as query param.
 * Returns typed ParsedHistory entries, filtering out unknown/invalid types.
 */
export async function fetchPlayerHistory(
  player: string,
  token: string,
  types: string,
  beforeBlock?: number
): Promise<ParsedHistory[]> {
  const params: Record<string, string | number> = {
    username: player,
    types,
    limit: HISTORY_PAGE_LIMIT,
    token,
  };
  if (beforeBlock) params.before_block = beforeBlock;

  try {
    const res = await splBaseClient.get("/players/history", { params });
    if (!Array.isArray(res.data)) throw new Error("Invalid response: expected array");
    return (res.data as SplHistory[])
      .map(parseHistoryToInternalTypes)
      .filter((e): e is ParsedHistory => e !== null);
  } catch (error) {
    logger.error(
      `Failed to fetch player history for ${player}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Paginates fetchPlayerHistory until entries older than startDate are reached.
 * Returns entries within [startDate, endDate] sorted newest first.
 */
export async function fetchPlayerHistoryByDateRange(
  player: string,
  token: string,
  types: string,
  startDate: Date,
  endDate: Date
): Promise<ParsedHistory[]> {
  const allEntries: ParsedHistory[] = [];
  let lastBlockNum: number | undefined;
  let hasMoreData = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (hasMoreData && iterations < MAX_ITERATIONS) {
    iterations++;
    if (iterations > 1) {
      await new Promise((resolve) => setTimeout(resolve, HISTORY_PAGE_DELAY_MS));
    }

    const batch = await fetchPlayerHistory(player, token, types, lastBlockNum);
    if (batch.length === 0) break;

    const filtered = batch.filter((entry) => {
      const d = new Date(entry.created_date);
      return d >= startDate && d <= endDate;
    });
    allEntries.push(...filtered);

    const oldest = batch[batch.length - 1];
    if (new Date(oldest.created_date) < startDate) break;

    lastBlockNum = oldest.block_num - 1;
    if (batch.length < HISTORY_PAGE_LIMIT) hasMoreData = false;
  }

  return allEntries.sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );
}

/**
 * Fetch pack jackpot overview from Splinterlands API
 */
export async function fetchPackJackpotOverview(edition: number = 14): Promise<PackJackpotCard[]> {
  const url = "/cards/pack_jackpot_overview";
  console.info(`Fetching pack jackpot overview for edition ${edition}`);

  try {
    const res = await splBaseClient.get(url, {
      params: { edition },
    });
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    console.info(`Fetched ${data.length} pack jackpot cards for edition ${edition}`);

    return data as PackJackpotCard[];
  } catch (error) {
    console.error(
      `Failed to fetch pack jackpot overview: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch mint history for a specific card and foil type.
 * When byDate is true, returns recent winners sorted by date instead.
 */
export async function fetchMintHistory(
  foil: number,
  cardDetailId: number,
  byDate: true,
  edition?: number
): Promise<MintHistoryByDateItem[]>;
export async function fetchMintHistory(
  foil: number,
  cardDetailId: number,
  byDate?: false,
  edition?: number
): Promise<MintHistoryResponse>;
export async function fetchMintHistory(
  foil: number,
  cardDetailId: number,
  byDate?: boolean,
  edition: number = 14
): Promise<MintHistoryResponse | MintHistoryByDateItem[]> {
  const url = "/cards/mint_history";

  try {
    const params = byDate
      ? { foil, by_date: true, by_date_edition: edition }
      : { foil, card_detail_id: cardDetailId };

    const res = await splBaseClient.get(url, { params });
    const data = res.data;

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response from Splinterlands API: expected object");
    }

    if (byDate) {
      if (!Array.isArray(data.mints)) {
        throw new Error(
          `Invalid response from Splinterlands API: expected mints array for foil ${foil}, edition ${edition}`
        );
      }
      return data.mints as MintHistoryByDateItem[];
    }

    return data as MintHistoryResponse;
  } catch (error) {
    console.error(
      `Failed to fetch mint history for foil ${foil}${
        byDate ? `, edition ${edition} (by_date)` : `, card ${cardDetailId}`
      }: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch pack jackpot skins from Splinterlands API
 */
export async function fetchJackPotSkins(): Promise<SplSkin[]> {
  const url = "/players/skins";
  console.info(`Fetching pack jackpot skins for username $JACKPOT_SKINS`);

  try {
    const res = await splBaseClient.get(url, { params: { username: "$JACKPOT_SKINS" } });
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    console.info(`Fetched ${data.length} pack jackpot skins for username $JACKPOT_SKINS`);

    return data as SplSkin[];
  } catch (error) {
    console.error(
      `Failed to fetch jackpot skins: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch pack jackpot gold from Splinterlands API
 */
export async function fetchJackPotGold(): Promise<SplCAGoldReward[]> {
  const url = "/cards/ca_gold_rewards";
  console.info(`Fetching pack jackpot gold for username $JACKPOT_GOLD`);

  try {
    const res = await splBaseClient.get(url);
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    return data as SplCAGoldReward[];
  } catch (error) {
    console.error(
      `Failed to fetch jackpot gold: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch ranked draws prize overview from Splinterlands API
 */
export async function fetchRankedDrawsPrizeOverview(): Promise<RankedDrawsPrizeCard[]> {
  const url = "/ranked_draws/prize_overview";
  console.info("Fetching ranked draws prize overview");

  try {
    const res = await splBaseClient.get(url);
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    console.info(`Fetched ${data.length} ranked draws prize cards`);

    return data as RankedDrawsPrizeCard[];
  } catch (error) {
    console.error(
      `Failed to fetch ranked draws prize overview: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetches card history for a specific card ID
 * @param cardId - The card ID (e.g., "C7-378-G32ZII2HWG")
 * @returns Array of card history items
 */
export async function fetchCardHistory(cardId: string): Promise<CardHistoryResponse> {
  try {
    console.info(`Fetching card history for card ID: ${cardId}`);

    const response = await splBaseClient.get("/cards/history", {
      params: {
        id: cardId,
      },
    });

    const { data } = response;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    console.info(`Fetched ${data.length} card history entries for card ${cardId}`);

    return data as CardHistoryResponse;
  } catch (error) {
    console.error(
      `Failed to fetch card history for ${cardId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch ranked draws prize overview from Splinterlands API
 */
export async function fetchFrontierDrawsPrizeOverview(): Promise<RankedDrawsPrizeCard[]> {
  const url = "/frontier_draws/prize_overview";
  console.info("Fetching frontier draws prize overview");

  try {
    const res = await splBaseClient.get(url);
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    console.info(`Fetched ${data.length} frontier draws prize cards`);

    return data as RankedDrawsPrizeCard[];
  } catch (error) {
    console.error(
      `Failed to fetch frontier draws prize overview: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch pack jackpot gold from Splinterlands API
 */
export async function fetchJackpotCards(): Promise<SplPlayerCardDetail[]> {
  const url = "/cards/collection/$JACKPOT";
  console.info(`Fetching pack jackpot gold for username $JACKPOT`);

  try {
    const res = await splBaseClient.get(url);
    const data = res.data as SplPlayerCollection;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data.cards)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    return data.cards;
  } catch (error) {
    console.error(
      `Failed to fetch jackpot gold: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}
/**
 * Fetch music inventory from Splinterlands API for $MUSIC_JACKPOT
 */
export async function fetchJackpotMusic(): Promise<SplInventoryItem[]> {
  const url = "/players/inventory";
  console.info(`Fetching music inventory for username $MUSIC_JACKPOT`);

  try {
    const res = await splBaseClient.get(url, { params: { username: "$MUSIC_JACKPOT" } });
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    // Filter items where type === "Music"
    const musicItems = data.filter((item: SplInventoryItem) => item.type === "Music");

    console.info(`Fetched ${musicItems.length} music items for username $MUSIC_JACKPOT`);

    return musicItems as SplInventoryItem[];
  } catch (error) {
    console.error(
      `Failed to fetch music inventory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch music inventory from Splinterlands API for $FRONTIER_MUSIC_JACKPOT
 */
export async function fetchFrontierJackpotMusic(): Promise<SplInventoryItem[]> {
  const url = "/players/inventory";
  console.info(`Fetching music inventory for username $FRONTIER_MUSIC_JACKPOT`);

  try {
    const res = await splBaseClient.get(url, { params: { username: "$FRONTIER_MUSIC_JACKPOT" } });
    const data = res.data;

    // Handle API-level error even if HTTP status is 200
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid response from Splinterlands API: expected array");
    }

    // Filter items where type === "Music"
    const musicItems = data.filter((item: SplInventoryItem) => item.type === "Music");

    console.info(`Fetched ${musicItems.length} music items for username $FRONTIER_MUSIC_JACKPOT`);

    return musicItems as SplInventoryItem[];
  } catch (error) {
    console.error(
      `Failed to fetch frontier music inventory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch recent prizes from ranked draws
 */
export async function fetchRankedDrawsRecentPrizes(foil: number): Promise<MintHistoryByDateItem[]> {
  const url = "/ranked_draws/recent_prizes";
  console.info(`Fetching ranked draws recent prizes for foil ${foil}`);

  try {
    const res = await splBaseClient.get(url, { params: { foil } });
    const data = res.data;

    if (Array.isArray(data)) return data as MintHistoryByDateItem[];
    if (data && Array.isArray(data.mints)) return data.mints as MintHistoryByDateItem[];

    throw new Error("Invalid response from Splinterlands API: expected array");
  } catch (error) {
    console.error(
      `Failed to fetch ranked draws recent prizes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

/**
 * Fetch recent prizes from frontier draws
 */
export async function fetchFrontierDrawsRecentPrizes(
  foil: number
): Promise<MintHistoryByDateItem[]> {
  const url = "/frontier_draws/recent_prizes";
  console.info(`Fetching frontier draws recent prizes for foil ${foil}`);

  try {
    const res = await splBaseClient.get(url, { params: { foil } });
    const data = res.data;

    if (Array.isArray(data)) return data as MintHistoryByDateItem[];
    if (data && Array.isArray(data.mints)) return data.mints as MintHistoryByDateItem[];

    throw new Error("Invalid response from Splinterlands API: expected array");
  } catch (error) {
    console.error(
      `Failed to fetch frontier draws recent prizes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Prices API  (https://prices.splinterlands.com)
// ---------------------------------------------------------------------------

export interface SplPrices {
  hive: number;
  dec: number;
  sps: number;
  voucher?: number;
  [key: string]: number | undefined;
}

const splPricesClient = axios.create({
  baseURL: "https://prices.splinterlands.com",
  timeout: 15000,
  headers: { "User-Agent": "SPL-Data/1.0" },
});

/** Fetch current token prices from prices.splinterlands.com/prices. */
export async function fetchSplPrices(): Promise<SplPrices> {
  try {
    const res = await splPricesClient.get<SplPrices>("/prices");
    if (!res.data || typeof res.data.hive !== "number") {
      throw new Error("Invalid prices response");
    }
    return res.data;
  } catch (error) {
    logger.error(
      `Failed to fetch SPL prices: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}
