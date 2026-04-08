/**
 * Client for https://vapi.splinterlands.com — the Splinterlands "visual" API
 * used mainly for land data (deeds, staked DEC, resources, liquidity pools).
 * All endpoints are public (no auth token required).
 */
import logger from "@/lib/backend/log/logger.server";
import axios from "axios";
import * as rax from "retry-axios";

const vapiClient = axios.create({
  baseURL: "https://vapi.splinterlands.com",
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
  token_symbol: string;
  resource_price: number; // DEC per 1 resource unit
  total_shares: number;
}

export interface VapiResourcesResponse {
  data: Array<{ amount: number }>;
}

export interface VapiLandResourcePool {
  data: VapiResourcePool[];
}

// ---------------------------------------------------------------------------
// Deeds
// ---------------------------------------------------------------------------

/** Fetch all deeds owned by a player (their "collection"). */
export async function fetchOwnedDeeds(player: string): Promise<VapiDeed[]> {
  try {
    const res = await vapiClient.get<VapiDeedsResponse>("/land/deeds", {
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
    const res = await vapiClient.get<VapiDeedsResponse>("/land/deeds", {
      params: { status: "market" },
    });
    return res.data?.data?.deeds ?? [];
  } catch (error) {
    logger.error(`vapi: fetchMarketDeeds: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Staked DEC (land)
// ---------------------------------------------------------------------------

/** Returns total DEC staked across all land plots for a player. */
export async function fetchStakedDec(player: string): Promise<number> {
  try {
    const res = await vapiClient.get<{ data: VapiStakedDecEntry[] }>("/land/stake/decstaked", {
      params: { player },
    });
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
    const res = await vapiClient.get<VapiLandResourcePool>("/land/liquidity/pools");
    return res.data?.data ?? [];
  } catch (error) {
    logger.error(`vapi: fetchLandResourcePools: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/** Fetch how much of a given resource a player currently holds. */
export async function fetchOwnedResource(player: string, resource: string): Promise<number> {
  try {
    const res = await vapiClient.get<VapiResourcesResponse>("/land/resources/owned", {
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
    const res = await vapiClient.get<VapiListingItemResponse>("/market/debug/listing-item", {
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
    }>("/market/landing", { params: { player } });
    return res.data?.data?.assets ?? [];
  } catch (error) {
    logger.error(
      `vapi: fetchMarketLanding(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}
