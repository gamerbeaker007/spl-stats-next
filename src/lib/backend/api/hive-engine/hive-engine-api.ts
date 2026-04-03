/**
 * Hive Engine JSON-RPC client.
 * Endpoint: https://api.hive-engine.com/rpc/contracts
 *
 * Used for:
 *  - Token market metrics (highestBid) → USD value calculation
 *  - DEC:SPS liquidity pool positions and pool totals
 */
import logger from "@/lib/backend/log/logger.server";
import axios from "axios";
import * as rax from "retry-axios";

const heClient = axios.create({
  baseURL: "https://api.hive-engine.com/rpc",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "SPL-Data/1.0",
  },
});

rax.attach(heClient);
heClient.defaults.raxConfig = {
  retry: 5,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
};

let _idCounter = 1;
function nextId() {
  return _idCounter++;
}

interface HERpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: "find" | "findOne";
  params: {
    contract: string;
    table: string;
    query: Record<string, unknown>;
    limit?: number;
    offset?: number;
    indexes?: unknown[];
  };
}

async function heRpc<T>(req: Omit<HERpcRequest, "jsonrpc" | "id">): Promise<T | null> {
  const body: HERpcRequest = {
    jsonrpc: "2.0",
    id: nextId(),
    method: req.method,
    params: req.params,
  };
  const res = await heClient.post<{ result: T }>("/contracts", body);
  return res.data?.result ?? null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HETokenMetric {
  symbol: string;
  volume: number;
  volumeExpiration: number;
  lastPrice: string;
  lowestAsk: string;
  highestBid: string;
  lastDayPrice: string;
  lastDayPriceExpiration: number;
  priceChangePercent: string;
  priceChangeHive: string;
}

export interface HELiquidityPool {
  tokenPair: string;
  baseQuantity: string; // DEC
  quoteQuantity: string; // SPS
  totalShares: string;
  precision: number;
}

export interface HELiquidityPosition {
  account: string;
  tokenPair: string;
  shares: string;
}

// ---------------------------------------------------------------------------
// Market metrics
// ---------------------------------------------------------------------------

/**
 * Fetch the highest bid price in HIVE for a single Hive Engine token.
 * Returns 0 if the token has no market activity.
 */
export async function fetchHETokenPriceHive(symbol: string): Promise<number> {
  try {
    const result = await heRpc<HETokenMetric>({
      method: "findOne",
      params: {
        contract: "market",
        table: "metrics",
        query: { symbol },
      },
    });
    if (!result) return 0;
    const bid = parseFloat(result.highestBid);
    return isNaN(bid) ? 0 : bid;
  } catch (error) {
    logger.error(
      `hive-engine: fetchHETokenPriceHive(${symbol}): ${error instanceof Error ? error.message : error}`
    );
    return 0;
  }
}

/**
 * Fetch all token market metrics from Hive Engine in a single call.
 * Returns a Map<symbol, highestBid_in_HIVE>.
 */
export async function fetchAllHEMetrics(): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();

  try {
    // The market metrics table can have many tokens; fetch in pages of 1000
    let offset = 0;
    const LIMIT = 1000;

    for (;;) {
      const result = await heRpc<HETokenMetric[]>({
        method: "find",
        params: {
          contract: "market",
          table: "metrics",
          query: {},
          limit: LIMIT,
          offset,
          indexes: [],
        },
      });

      if (!result || result.length === 0) break;

      for (const entry of result) {
        const bid = parseFloat(entry.highestBid);
        if (!isNaN(bid) && bid > 0) {
          priceMap.set(entry.symbol, bid);
        }
      }

      if (result.length < LIMIT) break;
      offset += LIMIT;
    }
  } catch (error) {
    logger.error(
      `hive-engine: fetchAllHEMetrics: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }

  return priceMap;
}

// ---------------------------------------------------------------------------
// DEC:SPS Liquidity pool
// ---------------------------------------------------------------------------

/** Fetch the pool details for the DEC:SPS pair. */
async function fetchDECSPSPool(): Promise<HELiquidityPool | null> {
  try {
    const result = await heRpc<HELiquidityPool>({
      method: "findOne",
      params: {
        contract: "marketpools",
        table: "pools",
        query: { tokenPair: "DEC:SPS" },
      },
    });
    return result;
  } catch (error) {
    logger.error(`hive-engine: fetchDECSPSPool: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/** Fetch a player's liquidity positions in the DEC:SPS pool. */
async function fetchDECSPSPosition(account: string): Promise<HELiquidityPosition[]> {
  try {
    const result = await heRpc<HELiquidityPosition[]>({
      method: "find",
      params: {
        contract: "marketpools",
        table: "liquidityPositions",
        query: { account, tokenPair: "DEC:SPS" },
        limit: 10,
        offset: 0,
      },
    });
    return result ?? [];
  } catch (error) {
    logger.error(
      `hive-engine: fetchDECSPSPosition(${account}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}

export interface LiquidityPoolResult {
  decQty: number;
  spsQty: number;
  decValue: number;
  spsValue: number;
}

/**
 * Calculate a player's share of the DEC:SPS liquidity pool.
 * Returns quantities and USD values for both tokens.
 */
export async function calculateDECSPSPoolValue(
  account: string,
  decPriceUsd: number,
  spsPriceUsd: number
): Promise<LiquidityPoolResult> {
  const [pool, positions] = await Promise.all([fetchDECSPSPool(), fetchDECSPSPosition(account)]);

  if (!pool || positions.length === 0) {
    return { decQty: 0, spsQty: 0, decValue: 0, spsValue: 0 };
  }

  const totalShares = parseFloat(pool.totalShares);
  const poolDec = parseFloat(pool.baseQuantity);
  const poolSps = parseFloat(pool.quoteQuantity);

  if (totalShares === 0) return { decQty: 0, spsQty: 0, decValue: 0, spsValue: 0 };

  const myShares = positions.reduce((sum, p) => sum + parseFloat(p.shares), 0);
  const sharePct = myShares / totalShares;

  const decQty = sharePct * poolDec;
  const spsQty = sharePct * poolSps;

  return {
    decQty,
    spsQty,
    decValue: decQty * decPriceUsd,
    spsValue: spsQty * spsPriceUsd,
  };
}
