import logger from "@/lib/backend/log/logger.server";
import {
  BalanceHistoryTokenType,
  SplBalanceHistoryItem,
  SplBalanceHistoryResponse,
  SplUnclaimedBalanceHistoryItem,
  UnclaimedTokenType,
} from "@/types/spl/balance";
import { SplLoginResponse } from "@/types/spl/auth";
import { SplPlayerDetails } from "@/types/spl/player";
import { SplSeasonInfo, SplSettings } from "@/types/spl/season";
import { SplLeaderboardPlayer, SplLeaderboardResponse, SplFormats } from "@/types/spl/leaderboard";
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

/** Fetch player details (includes join_date) from /players/details. */
export async function fetchPlayerDetails(username: string): Promise<SplPlayerDetails> {
  try {
    const res = await splBaseClient.get("/players/details", {
      params: { name: username },
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
