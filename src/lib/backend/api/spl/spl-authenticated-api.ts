/**
 * Authenticated SPL API calls.
 *
 * All functions in this module require a valid JWT token obtained from the SPL
 * login endpoint. The JWT is sent as an Authorization: Bearer header instead of
 * a query parameter, following the SPL team's recommendation to use JWT-based
 * authentication rather than long-lived game tokens.
 *
 * Public (unauthenticated) API calls remain in spl-api.ts.
 */

import logger from "@/lib/backend/log/logger.server";
import {
  BalanceHistoryTokenType,
  SplBalanceHistoryItem,
  SplBalanceHistoryResponse,
  SplUnclaimedBalanceHistoryItem,
  UnclaimedTokenType,
} from "@/types/spl/balance";
import { BATTLE_FORMATS, SplBattle, SplBattleHistoryResponse } from "@/types/spl/battle";
import { SplBrawlDetails } from "@/types/spl/brawl";
import { SplDailyProgress } from "@/types/spl/dailies";
import { SplFormat } from "@/types/spl/format";
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
import { SplHistory } from "@/types/spl/history";
import axios, { AxiosRequestConfig } from "axios";
import * as rax from "retry-axios";

const SPL_BASE_URL = "https://api2.splinterlands.com/";
const SPL_USER_AGENT = process.env.SPL_USER_AGENT ?? "spl-stats-instance/1.0";

const splAuthClient = axios.create({
  baseURL: SPL_BASE_URL,
  timeout: 60000,
  headers: {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": SPL_USER_AGENT,
  },
});

rax.attach(splAuthClient);
splAuthClient.defaults.raxConfig = {
  retry: 10,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
  onRetryAttempt: async (err) => {
    const cfg = rax.getConfig(err);
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const msg = axios.isAxiosError(err)
      ? ((err.response?.data as Record<string, unknown>)?.error ??
        err.response?.statusText ??
        err.message)
      : String(err);
    logger.warn(
      `[auth] Retry attempt #${cfg?.currentRetryAttempt}${status ? ` (HTTP ${status})` : ""}: ${msg}`
    );
  },
};

/** Build Axios config that injects the JWT as a Bearer token. */
function bearerConfig(jwtToken: string, extra?: AxiosRequestConfig): AxiosRequestConfig {
  return {
    ...extra,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      ...extra?.headers,
    },
  };
}

// ---------------------------------------------------------------------------
// Balance History (authenticated)
// ---------------------------------------------------------------------------

/** Fetch a single page of /players/balance_history using dual-cursor pagination. */
export async function fetchBalanceHistoryPage(
  username: string,
  tokenType: BalanceHistoryTokenType,
  jwtToken: string,
  fromDate?: string,
  lastUpdateDate?: string,
  limit: number = 1000
): Promise<SplBalanceHistoryItem[]> {
  const params: Record<string, string | number> = {
    username,
    token_type: tokenType,
    limit,
  };
  if (fromDate) params.from = fromDate;
  if (lastUpdateDate) params.last_update_date = lastUpdateDate;

  try {
    const res = await splAuthClient.get(
      "/players/balance_history",
      bearerConfig(jwtToken, { params })
    );
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
// Unclaimed Balance History (authenticated)
// ---------------------------------------------------------------------------

/** Fetch a single page of /players/unclaimed_balance_history using id-based offset. */
export async function fetchUnclaimedBalanceHistoryPage(
  username: string,
  tokenTypes: UnclaimedTokenType[],
  jwtToken: string,
  offset?: string,
  limit: number = 1000
): Promise<SplUnclaimedBalanceHistoryItem[]> {
  const params: Record<string, string | number> = {
    username,
    token_type: tokenTypes.join(","),
    limit,
  };
  if (offset) params.offset = offset;

  try {
    const res = await splAuthClient.get(
      "/players/unclaimed_balance_history",
      bearerConfig(jwtToken, { params })
    );
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
// Brawl (optionally authenticated)
// ---------------------------------------------------------------------------

/** Fetch brawl details for a guild/tournament. Pass jwtToken to access private data. */
export async function fetchBrawlDetails(
  guildId: string,
  tournamentId: string,
  player: string,
  jwtToken?: string
): Promise<SplBrawlDetails> {
  const params: Record<string, string> = {
    guild_id: guildId,
    id: tournamentId,
    username: player,
  };
  const config = jwtToken ? bearerConfig(jwtToken, { params }) : { params };
  try {
    const res = await splAuthClient.get("/tournaments/find_brawl", config);
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
// Battle History (authenticated)
// ---------------------------------------------------------------------------

/**
 * Fetch battle history for an account across all supported formats
 * (wild, modern, foundation, survival) and return a deduplicated list.
 * Authenticated — requires the player's JWT token.
 * Limit per format: 50 (SPL API cap).
 */
export async function fetchBattleHistory(
  player: string,
  jwtToken: string,
  limit = 50
): Promise<SplBattle[]> {
  const seen = new Set<string>();
  const battles: SplBattle[] = [];

  for (const format of BATTLE_FORMATS) {
    try {
      const params: Record<string, string | number> = {
        player,
        username: player,
        limit,
        ...(format !== "wild" ? { format } : {}),
      };
      const res = await splAuthClient.get<SplBattleHistoryResponse>(
        "/battle/history2",
        bearerConfig(jwtToken, { params })
      );
      const list = res.data?.battles;
      if (!Array.isArray(list)) continue;

      for (const b of list) {
        if (!seen.has(b.battle_queue_id_1)) {
          seen.add(b.battle_queue_id_1);
          battles.push(b);
        }
      }
    } catch (error) {
      logger.warn(
        `fetchBattleHistory: format=${format} player=${player}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return battles;
}

// ---------------------------------------------------------------------------
// Daily Progress (authenticated)
// ---------------------------------------------------------------------------

/** Fetch daily quest/focus progress using JWT Bearer auth. */
export async function fetchDailyProgress(
  player: string,
  jwtToken: string,
  format: SplFormat
): Promise<SplDailyProgress> {
  try {
    const res = await splAuthClient.get(
      "/dailies/progress",
      bearerConfig(jwtToken, { params: { username: player, format } })
    );
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
// Player History (authenticated)
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
 * Fetch a page of player history using JWT Bearer auth.
 * Returns typed ParsedHistory entries, filtering out unknown/invalid types.
 */
export async function fetchPlayerHistory(
  player: string,
  jwtToken: string,
  types: string,
  beforeBlock?: number
): Promise<ParsedHistory[]> {
  const params: Record<string, string | number> = {
    username: player,
    types,
    limit: HISTORY_PAGE_LIMIT,
  };
  if (beforeBlock) params.before_block = beforeBlock;

  try {
    const res = await splAuthClient.get("/players/history", bearerConfig(jwtToken, { params }));
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
  jwtToken: string,
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

    const batch = await fetchPlayerHistory(player, jwtToken, types, lastBlockNum);
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

// ---------------------------------------------------------------------------
// Market History (authenticated)
// ---------------------------------------------------------------------------

/** Paginate through market_purchase and marketplace_purchase history within a date range. */
export async function fetchMarketHistoryByDateRange(
  player: string,
  jwtToken: string,
  startDate: Date,
  endDate: Date
): Promise<SplHistory[]> {
  const types = "market_purchase,marketplace_purchase";
  const allEntries: SplHistory[] = [];
  let lastBlockNum: number | undefined;
  let hasMoreData = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (hasMoreData && iterations < MAX_ITERATIONS) {
    iterations++;
    if (iterations > 1) {
      await new Promise((resolve) => setTimeout(resolve, HISTORY_PAGE_DELAY_MS));
    }

    const params: Record<string, string | number> = {
      username: player,
      types,
      limit: HISTORY_PAGE_LIMIT,
    };
    if (lastBlockNum) params.before_block = lastBlockNum;

    let batch: SplHistory[] = [];
    try {
      const res = await splAuthClient.get("/players/history", bearerConfig(jwtToken, { params }));
      if (Array.isArray(res.data)) batch = res.data as SplHistory[];
    } catch {
      break;
    }
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

  return allEntries;
}

// ---------------------------------------------------------------------------
// Token verification (authenticated)
// ---------------------------------------------------------------------------

/**
 * Result of a JWT verification attempt.
 * - "valid"   — token is accepted by the SPL API
 * - "invalid" — SPL API rejected the token (HTTP 401 or explicit error in body)
 * - "error"   — transient failure (network error, 5xx, timeout) — do not mark as invalid
 */
export type TokenVerifyResult = "valid" | "invalid" | "error";

/**
 * Verifies a JWT token by attempting to fetch balance history using Bearer auth.
 * Distinguishes auth failures (401 / API error body) from transient network errors.
 */
export async function verifySplJwt(username: string, jwtToken: string): Promise<TokenVerifyResult> {
  try {
    const res = await splAuthClient.get<SplBalanceHistoryResponse>(
      "/players/balance_history",
      bearerConfig(jwtToken, {
        params: { limit: 1, offset: 0, username, token_type: "SPS" },
      })
    );
    const data = res.data;
    if (Array.isArray(data)) return "valid";
    if (data && typeof data === "object" && "error" in data) return "invalid";
    return "invalid";
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return "invalid";
    }
    return "error";
  }
}
