/**
 * Client for https://vapi.splinterlands.com — the Splinterlands "visual" API
 * used mainly for land data (deeds, staked DEC, resources, liquidity pools).
 * All endpoints are public (no auth token required).
 */
import logger from "@/lib/backend/log/logger.server";
import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import { SPL_VAPI } from "@/lib/shared/config/spl-endpoints";
import type { LandMarketDeedRaw } from "@/types/land/landMarket";
import axios from "axios";
import * as rax from "retry-axios";

const vapiClient = axios.create({
  baseURL: splApiConfig.vapiBaseUrl,
  timeout: 60000,
  headers: { "User-Agent": "SPL-Data/1.0" },
});

rax.attach(vapiClient);
vapiClient.defaults.raxConfig = {
  retry: 5,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VapiDeed {
  uid: string;
  player: string;
  rarity: string;
  plot_status: string;
  magic_type: string;
  deed_type: string;
  listing_price: number | null;
  status: string;
}

export interface VapiDeedsResponse {
  data: { deeds: VapiDeed[] };
  total_count?: number;
}

export interface VapiStakedDecEntry {
  amount: number;
  plot_id?: string;
}

export interface VapiResourcePool {
  id: number;
  token_symbol: string;
  is_external_resource?: boolean;
  resource_quantity: number | string;
  dec_quantity?: number | string;
  resource_price: number; // DEC per 1 resource unit
  total_shares: number | string;
}

export interface VapiResourcesResponse {
  data: Array<{ amount: number }>;
}

export interface VapiLandResourcePool {
  data: VapiResourcePool[];
}

interface VapiPlayerLiquidityEntry {
  player: string;
  token: string;
  balance: number | string;
}

interface VapiPlayerLiquidityResponse {
  status: string;
  data?: {
    single?: VapiPlayerLiquidityEntry[];
  };
}

export interface VapiPlayerLiquidityPosition {
  token: string;
  shares: number;
}

interface VapiLiquidityPoolInfo {
  id: number;
  token_symbol: string;
  resource_quantity: number | string;
  dec_quantity: number | string;
  total_shares: number | string;
}

interface VapiLiquidityPoolInfoResponse {
  status: string;
  data?: VapiLiquidityPoolInfo;
}

export interface DecSpsLiquidityPoolResult {
  decQty: number;
  spsQty: number;
  decValue: number;
  spsValue: number;
  hasPosition: boolean;
}

function parseNumeric(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Deeds
// ---------------------------------------------------------------------------

/** Fetch all deeds owned by a player (their "collection"). */
export async function fetchOwnedDeeds(player: string): Promise<VapiDeed[]> {
  try {
    const res = await vapiClient.get<VapiDeedsResponse>(SPL_VAPI.LAND_DEEDS, {
      params: { status: "collection", player },
    });
    return res.data?.data?.deeds ?? [];
  } catch (error) {
    logger.error(
      `vapi: fetchOwnedDeeds(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}

/**
 * Fetch all market-listed deeds (paginated).
 */
export async function fetchMarketDeeds(): Promise<VapiDeed[]> {
  try {
    const res = await vapiClient.get<VapiDeedsResponse>(SPL_VAPI.LAND_DEEDS, {
      params: { status: "market" },
    });
    return res.data?.data?.deeds ?? [];
  } catch (error) {
    logger.error(`vapi: fetchMarketDeeds: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Every market-listed deed with full listing detail (`market_id`, `listing_price`,
 * `stats`, `land_stats`, …) for the Land Market page. ~2.5k rows in one response.
 */
export async function fetchLandMarketDeeds(): Promise<LandMarketDeedRaw[]> {
  try {
    const res = await vapiClient.get<{ data: { deeds: LandMarketDeedRaw[] } }>(
      SPL_VAPI.LAND_DEEDS,
      {
        params: { status: "market" },
      }
    );
    return res.data?.data?.deeds ?? [];
  } catch (error) {
    logger.error(`vapi: fetchLandMarketDeeds: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Staked DEC (land)
// ---------------------------------------------------------------------------

/** Returns total DEC staked across all land plots for a player. */
export async function fetchStakedDec(player: string): Promise<number> {
  try {
    const res = await vapiClient.get<{ data: VapiStakedDecEntry[] }>(
      SPL_VAPI.LAND_STAKE_DEC_STAKED,
      {
        params: { player },
      }
    );
    const entries = res.data?.data ?? [];
    return entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  } catch (error) {
    logger.error(
      `vapi: fetchStakedDec(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Land resources
// ---------------------------------------------------------------------------

/** Fetch all resource liquidity pools (gives resource_price in DEC per unit). */
export async function fetchLandResourcePools(): Promise<VapiResourcePool[]> {
  try {
    const res = await vapiClient.get<VapiLandResourcePool>(SPL_VAPI.LAND_LIQUIDITY_POOLS);
    return res.data?.data ?? [];
  } catch (error) {
    logger.error(`vapi: fetchLandResourcePools: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Fetch a player's LP entries for SPS-related in-game pools.
 * The DEC-SPS entry is expected under token "DEC-SPS".
 */
export async function fetchPlayerLiquidityPoolsSps(
  player: string
): Promise<VapiPlayerLiquidityEntry[]> {
  try {
    const res = await vapiClient.get<VapiPlayerLiquidityResponse>(
      SPL_VAPI.LAND_LIQUIDITY_PLAYER_POOL(player, "SPS")
    );
    return res.data?.data?.single ?? [];
  } catch (error) {
    logger.error(
      `vapi: fetchPlayerLiquidityPoolsSps(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}

/**
 * Fetch a player's share count for a specific pool symbol.
 * For land resources this is token DEC-<SYMBOL> (e.g. DEC-WOOD).
 */
export async function fetchPlayerLiquidityPoolShares(
  player: string,
  poolSymbol: string
): Promise<VapiPlayerLiquidityPosition | null> {
  try {
    const res = await vapiClient.get<VapiPlayerLiquidityResponse>(
      SPL_VAPI.LAND_LIQUIDITY_PLAYER_POOL(player, poolSymbol)
    );

    const expectedToken = `DEC-${poolSymbol.toUpperCase()}`;
    const entry = res.data?.data?.single?.find((item) => item.token === expectedToken);
    if (!entry) return null;

    return {
      token: entry.token,
      shares: parseNumeric(entry.balance),
    };
  } catch (error) {
    logger.warn(
      `vapi: fetchPlayerLiquidityPoolShares(${player}, ${poolSymbol}): ${
        error instanceof Error ? error.message : error
      }`
    );
    return null;
  }
}

/**
 * Fetch in-game DEC-SPS pool totals (pool id 100).
 */
export async function fetchDecSpsLiquidityPoolInfo(): Promise<VapiLiquidityPoolInfo | null> {
  try {
    const res = await vapiClient.get<VapiLiquidityPoolInfoResponse>(
      SPL_VAPI.LAND_LIQUIDITY_POOL(100)
    );
    const info = res.data?.data;
    if (!info || info.token_symbol !== "SPS") return null;
    return info;
  } catch (error) {
    logger.error(
      `vapi: fetchDecSpsLiquidityPoolInfo: ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}

/**
 * Calculate a player's underlying DEC/SPS from in-game DEC-SPS LP shares.
 */
export async function calculateDECSPSPoolValue(
  player: string,
  decPriceUsd: number,
  spsPriceUsd: number
): Promise<DecSpsLiquidityPoolResult> {
  const [playerEntries, poolInfo] = await Promise.all([
    fetchPlayerLiquidityPoolsSps(player),
    fetchDecSpsLiquidityPoolInfo(),
  ]);

  if (!poolInfo) {
    return { decQty: 0, spsQty: 0, decValue: 0, spsValue: 0, hasPosition: false };
  }

  const decSpsEntry = playerEntries.find((entry) => entry.token === "DEC-SPS");
  if (!decSpsEntry) {
    return { decQty: 0, spsQty: 0, decValue: 0, spsValue: 0, hasPosition: false };
  }

  const userShares = parseNumeric(decSpsEntry.balance);
  const totalShares = parseNumeric(poolInfo.total_shares);
  const poolSpsQty = parseNumeric(poolInfo.resource_quantity);
  const poolDecQty = parseNumeric(poolInfo.dec_quantity);

  if (userShares <= 0 || totalShares <= 0) {
    return { decQty: 0, spsQty: 0, decValue: 0, spsValue: 0, hasPosition: false };
  }

  const ownership = userShares / totalShares;
  const decQty = poolDecQty * ownership;
  const spsQty = poolSpsQty * ownership;

  return {
    decQty,
    spsQty,
    decValue: decQty * decPriceUsd,
    spsValue: spsQty * spsPriceUsd,
    hasPosition: true,
  };
}

/** Fetch how much of a given resource a player currently holds. */
export async function fetchOwnedResource(player: string, resource: string): Promise<number> {
  try {
    const res = await vapiClient.get<VapiResourcesResponse>(SPL_VAPI.LAND_RESOURCES_OWNED, {
      params: { player, resource },
    });
    const entries = res.data?.data ?? [];
    return entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  } catch (error) {
    logger.warn(
      `vapi: fetchOwnedResource(${player}, ${resource}): ${error instanceof Error ? error.message : error}`
    );
    return 0; // resource might not exist for this player — treat as 0
  }
}

// ---------------------------------------------------------------------------
// Marketplace listing items
// ---------------------------------------------------------------------------

export interface VapiListingItemResponse {
  status: string;
  data: {
    listing: { player: string; quantity: number };
    item: { id: number; detailId: string; itemId: string; quantity: number };
  };
}

/** Fetch marketplace listing item details by listingItemId. */
export async function fetchListingItem(
  listingItemId: number
): Promise<VapiListingItemResponse | null> {
  try {
    const res = await vapiClient.get<VapiListingItemResponse>(SPL_VAPI.MARKET_DEBUG_LISTING_ITEM, {
      params: { listingItemId },
    });
    return res.data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Market landing (inventory asset prices)
// ---------------------------------------------------------------------------

export interface VapiMarketLandingPrice {
  currency: string;
  minPrice: number;
}

export interface VapiMarketLandingAsset {
  assetName: string;
  detailId: string;
  detailName: string;
  detailImage?: string;
  numOwned: number;
  numListed: number;
  prices: VapiMarketLandingPrice[];
}

/**
 * Fetch all tradeable asset types with current market prices and player's own count.
 * Covers packs, skins, totems, and other in-game items.
 */
export async function fetchMarketLanding(player: string): Promise<VapiMarketLandingAsset[]> {
  try {
    const res = await vapiClient.get<{
      status: string;
      data: { assets: VapiMarketLandingAsset[] };
    }>(SPL_VAPI.MARKET_LANDING, { params: { player } });
    return res.data?.data?.assets ?? [];
  } catch (error) {
    logger.error(
      `vapi: fetchMarketLanding(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}
