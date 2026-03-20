import logger from "@/lib/backend/log/logger.server";
import { SplBalanceHistoryResponse } from "@/types/spl/balance";
import { SplLoginResponse } from "@/types/spl/auth";
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
