"use client";

import { getDecPriceUsdAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { toCardFoil, toCardFoilInt } from "@/lib/shared/card-utils";
import { SPL_API, SPL_VAPI } from "@/lib/shared/config/spl-endpoints";
import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import {
  normalizeMarketplaceAssetMetaDetail,
  normalizeMarketplaceLandingAsset,
  normalizeMarketplaceListingItem,
  normalizeMarketplacePlayerListing,
  parseMarketplaceAssetName,
} from "@/lib/shared/marketplace-assets";
import { normalizeTransactionLookup } from "@/lib/shared/trx-lookup-parser";
import type { CardFoil } from "@/types/card";
import type { CardHistoryResponse } from "@/types/jackpot-prizes/cardHistory";
import type { LandOwnedRegionRaw } from "@/types/land/landMarket";
import type {
  FetchMarketplaceListingItemsParams,
  MarketplaceAssetMetaDetail,
  MarketplaceAssetMetaDetailRaw,
  MarketplaceAssetName,
  MarketplaceLandingAsset,
  MarketplaceLandingAssetRaw,
  MarketplaceListingItem,
  MarketplaceListingItemRaw,
  MarketplaceListingItemsPage,
  MarketplacePlayerListing,
  MarketplacePlayerListingRaw,
} from "@/types/marketplace-assets";
import type {
  FetchMarketListingsByCardParams,
  SplMarketListing,
  SplMarketListingsResponse,
  SplTransactionLookupResponse,
} from "@/types/purchase/purchase-plan";
import type { SplBalance } from "@/types/spl/balances";
import type { SplCardCollection } from "@/types/spl/card";
import type { SplPlayerDetails } from "@/types/spl/details";
import type { SplFrontierDrawStatus, SplRankedDrawStatus } from "@/types/spl/draws";
import type { SplInventoryItem, SplSkin } from "@/types/spl/jackpot";
import type { SplCardListingPriceEntry } from "@/types/spl/market";
import type { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import type {
  VapiLandResourcePool,
  VapiResourcePool,
  VapiStakedDecEntry,
} from "../backend/api/spl/vapi-spl";

/**
 * The only path for every "browser (live)" SPL data type (see CLAUDE.md):
 * balances, land-staked DEC, DEC-SPS pool positions, inventory, card collection,
 * grouped market prices, card history,
 * owned land regions, marketplace holdings (landing / player listings / skins),
 * dashboard player details / draws / season rewards, and jackpot prize account
 * collections / inventories / skins,
 * card + marketplace listings, and tx lookup. These reads
 * count against the visitor's IP rate limit instead of the server's. The SPL
 * hosts answer CORS for any origin; they're allowed in the CSP `connect-src`
 * (`next.config.ts`).
 *
 * No server fallback: a visitor who can't reach SPL from the browser can't play
 * the game either. Failures throw and surface through the caller's error state.
 *
 * Never put authenticated (JWT) calls here — tokens stay server-side.
 */

const BROWSER_TIMEOUT_MS = 15_000;
let landResourcePoolsRequest: Promise<VapiResourcePool[]> | null = null;

async function requestJson(baseUrl: string, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(BROWSER_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`${new URL(baseUrl).host}${path} returned HTTP ${res.status}`);
  }
  return res.json();
}

function withQuery(path: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  );
  return `${path}?${query}`;
}

function apiGet(path: string, params: Record<string, string | number>): Promise<unknown> {
  return requestJson(splApiConfig.publicBaseUrl, withQuery(path, params));
}

function vapiGet(path: string, params: Record<string, string | number>): Promise<unknown> {
  return requestJson(splApiConfig.vapiBaseUrl, withQuery(path, params));
}

async function fetchListingItemsPage(
  params: FetchMarketplaceListingItemsParams
): Promise<MarketplaceListingItemsPage> {
  const body = (await requestJson(splApiConfig.vapiBaseUrl, SPL_VAPI.MARKET_LISTING_ITEMS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })) as { data?: { items?: MarketplaceListingItemRaw[]; total?: number } } | null;

  const items = body?.data?.items;
  if (!Array.isArray(items)) throw new Error("Invalid listing-items response");
  return {
    items: items.map((item) => normalizeMarketplaceListingItem(item, params.assetName)),
    total: body?.data?.total ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Balances / inventory
// ---------------------------------------------------------------------------

export interface AccountBalances {
  account: string;
  balances: SplBalance[];
}

/** Balances of one account (`/players/balances`). */
export async function fetchAccountBalances(account: string): Promise<SplBalance[]> {
  const data = await apiGet(SPL_API.PLAYER_BALANCES, { username: account.trim().toLowerCase() });
  if (!Array.isArray(data)) throw new Error("Invalid balances response");
  return data as SplBalance[];
}

export async function fetchStakedDEC(account: string): Promise<number> {
  const response = (await vapiGet(SPL_VAPI.LAND_STAKE_DEC_STAKED, {
    player: account.trim().toLowerCase(),
  })) as { data?: VapiStakedDecEntry[] } | null;

  const entries = response?.data ?? [];
  if (!Array.isArray(entries)) throw new Error("Invalid staked DEC response");
  return entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

export function fetchLandResourcePools(): Promise<VapiResourcePool[]> {
  if (!landResourcePoolsRequest) {
    landResourcePoolsRequest = (async () => {
      const response = (await vapiGet(
        SPL_VAPI.LAND_LIQUIDITY_POOLS,
        {}
      )) as VapiLandResourcePool | null;
      const entries = response?.data ?? [];
      if (!Array.isArray(entries)) throw new Error("Invalid land resource pools response");
      return entries as VapiResourcePool[];
    })().catch((error: unknown) => {
      landResourcePoolsRequest = null;
      throw error;
    });
  }

  return landResourcePoolsRequest;
}

export function fetchBalancesForAccounts(accounts: string[]): Promise<AccountBalances[]> {
  const uniqueAccounts = Array.from(new Set(accounts.map((a) => a.toLowerCase())));
  return Promise.all(
    uniqueAccounts.map(async (account) => ({
      account,
      balances: await fetchAccountBalances(account),
    }))
  );
}

async function loadInventory(
  account: string,
  normalizeUsername: boolean
): Promise<SplInventoryItem[]> {
  const username = normalizeUsername ? account.trim().toLowerCase() : account.trim();
  const data = await apiGet(SPL_API.PLAYER_INVENTORY, { username });
  if (!Array.isArray(data)) throw new Error("Invalid inventory response");
  return data as SplInventoryItem[];
}

/** Live item inventory for a player username; normalizes player names to lowercase. */
export async function fetchInventory(username: string): Promise<SplInventoryItem[]> {
  return loadInventory(username, true);
}

/** Same inventory endpoint, preserving case for system accounts prefixed with `$`. */
export async function fetchAccountInventory(account: string): Promise<SplInventoryItem[]> {
  return loadInventory(account, false);
}

/** Skins held by a named SPL account, including system accounts prefixed with `$`. */
export async function fetchAccountSkins(account: string): Promise<SplSkin[]> {
  const data = await apiGet(SPL_API.PLAYER_SKINS, { username: account.trim() });
  if (!Array.isArray(data)) throw new Error("Invalid account skins response");
  return data as SplSkin[];
}

// ---------------------------------------------------------------------------
// Dashboard: player details, draws, current season rewards
// ---------------------------------------------------------------------------

/** League, rating, guild and per-format season details (`/players/details`). */
export async function fetchPlayerDetails(username: string): Promise<SplPlayerDetails> {
  const data = await apiGet(SPL_API.PLAYER_DETAILS, {
    name: username.trim().toLowerCase(),
    season_details: "true",
    format: "all",
  });
  if (!data || typeof data !== "object") throw new Error("Invalid player details response");
  return data as SplPlayerDetails;
}

/** Ranked + frontier draw status. */
export async function fetchPlayerDraws(
  username: string
): Promise<{ ranked: SplRankedDrawStatus; frontier: SplFrontierDrawStatus }> {
  const params = { username: username.trim().toLowerCase() };
  const [ranked, frontier] = await Promise.all([
    apiGet(SPL_API.RANKED_DRAWS_STATUS, params),
    apiGet(SPL_API.FRONTIER_DRAWS_STATUS, params),
  ]);
  if (!ranked || !frontier) throw new Error("Invalid draws response");
  return {
    ranked: ranked as SplRankedDrawStatus,
    frontier: frontier as SplFrontierDrawStatus,
  };
}

/** Current-season reward progress (glint per format). */
export async function fetchCurrentRewards(username: string): Promise<SPLSeasonRewards> {
  const data = await apiGet(SPL_API.PLAYER_CURRENT_REWARDS, {
    username: username.trim().toLowerCase(),
  });
  if (!data) throw new Error("Invalid current rewards response");
  return data as SPLSeasonRewards;
}

// ---------------------------------------------------------------------------
// Cards (`/cards/collection`, `/cards/history`) and grouped market prices
// ---------------------------------------------------------------------------

/**
 * Every card the account owns or has delegated to it. Large (MBs) for big accounts.
 * The `preserveCase` option keeps the account name as-is, otherwise it's lowercased.
 * For example for sprecial account like $JACKPOT
 * */
export async function fetchCardCollection(
  username: string,
  { preserveCase = false }: { preserveCase?: boolean } = {}
): Promise<SplCardCollection> {
  const account = username.trim();
  const collectionAccount = preserveCase ? account : account.toLowerCase();
  const data = (await requestJson(
    splApiConfig.publicBaseUrl,
    SPL_API.CARDS_COLLECTION(collectionAccount)
  )) as SplCardCollection | null;
  if (!Array.isArray(data?.cards)) throw new Error("Invalid card collection response");
  return data;
}

/** Lowest listing prices per card / edition / foil / level, market wide. */
export async function fetchMarketForSaleGrouped(): Promise<SplCardListingPriceEntry[]> {
  const data = await requestJson(splApiConfig.publicBaseUrl, SPL_API.MARKET_FOR_SALE_GROUPED);
  if (!Array.isArray(data)) throw new Error("Invalid grouped market response");
  return data as SplCardListingPriceEntry[];
}

/** Transfer / combine / burn history of one card uid. */
export async function fetchCardHistory(uid: string): Promise<CardHistoryResponse> {
  const data = await apiGet(SPL_API.CARD_HISTORY, { id: uid });
  if (!Array.isArray(data)) throw new Error("Invalid card history response");
  return data as CardHistoryResponse;
}

// ---------------------------------------------------------------------------
// Card market listings (`/market/market_query_by_card`)
// ---------------------------------------------------------------------------

export interface MarketListingRow {
  marketId: string;
  uid?: string;
  cardDetailId: number;
  edition: number;
  foil: CardFoil;
  level: number;
  cc: number;
  priceUsd: number;
  priceDec: number;
  priceCredits: number;
  pricePerCcDec: number;
  seller?: string;
}

/**
 * Listings for one card target, cheapest per CC first, priced in DEC / credits.
 * "buy" maps to the API's "sell" listing type. The DEC rate comes from the
 * server's shared price cache.
 */
export async function fetchMarketListingRows({
  cardDetailId,
  foil,
  edition,
  type = "buy",
  level,
}: FetchMarketListingsByCardParams): Promise<MarketListingRow[]> {
  const params: Record<string, string | number> = {
    card_detail_id: cardDetailId,
    foil: toCardFoilInt(foil),
    edition,
    type: type === "buy" ? "sell" : type,
    sort: "low_price_bcx",
  };
  if (typeof level === "number") params.level = level;

  const [data, decPriceUsd] = await Promise.all([
    apiGet(SPL_API.MARKET_QUERY_BY_CARD, params),
    getDecPriceUsdAction(),
  ]);

  const body = data as SplMarketListing[] | SplMarketListingsResponse | null;
  const listings = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(listings)) throw new Error("Invalid response from Splinterlands API");

  const decUsd = Math.max(decPriceUsd, 0);
  return listings
    .sort((a, b) => a.buy_price / Math.max(1, a.bcx) - b.buy_price / Math.max(1, b.bcx))
    .map((listing) => {
      const priceUsd = listing.buy_price ?? 0;
      const priceDec = decUsd > 0 ? priceUsd / decUsd : 0;
      const cc = listing.bcx ?? 1;
      return {
        marketId: listing.market_id,
        uid: listing.uid,
        cardDetailId: listing.card_detail_id,
        edition: listing.edition,
        foil: toCardFoil(listing.foil),
        level: listing.level,
        cc,
        priceUsd,
        priceDec,
        priceCredits: priceUsd * 1000,
        pricePerCcDec: cc > 0 ? priceDec / cc : priceDec,
        seller: listing.seller,
      };
    });
}

// ---------------------------------------------------------------------------
// Marketplace listings (vapi `/market/listing-items`)
// ---------------------------------------------------------------------------

/** Active marketplace listings for one asset, cheapest first. */
export async function fetchMarketplaceAssetListings(
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<MarketplaceListingItem[]> {
  const page = await fetchListingItemsPage({
    assetName,
    detailIds: [detailId],
    sort: { field: "price", order: "asc" },
  });
  return page.items;
}

/** Regions a player owns plots in, as `{ uid: region_uid, count }` rows. */
export async function fetchOwnedLandRegions(player: string): Promise<LandOwnedRegionRaw[]> {
  const body = (await requestJson(
    splApiConfig.vapiBaseUrl,
    SPL_VAPI.LAND_DEEDS_OWNED(player.trim().toLowerCase())
  )) as { data?: LandOwnedRegionRaw[] } | null;
  return Array.isArray(body?.data) ? body.data : [];
}

/**
 * Every item of one marketplace asset type with market prices and, when `player`
 * is given, that player's owned / listed counts (`/market/landing`).
 */
export async function fetchMarketplaceLanding(
  player: string | null,
  assetName: MarketplaceAssetName
): Promise<MarketplaceLandingAsset[]> {
  const params: Record<string, string> = { assets: assetName };
  if (player) params.player = player.trim().toLowerCase();
  const body = (await vapiGet(SPL_VAPI.MARKET_LANDING, params)) as {
    data?: { assets?: MarketplaceLandingAssetRaw[] };
  } | null;
  return (body?.data?.assets ?? []).map((asset) =>
    normalizeMarketplaceLandingAsset(asset, parseMarketplaceAssetName(asset.assetName))
  );
}

/**
 * Item metadata (name, image, set, circulation) for every item of one asset type
 * (`/market/meta/asset`). Without `detailIds` the API returns all of them — the
 * same set the landing call lists — so it needs no landing round trip first.
 */
export async function fetchMarketplaceAssetMeta(
  assetName: MarketplaceAssetName
): Promise<MarketplaceAssetMetaDetail[]> {
  const body = (await requestJson(
    splApiConfig.vapiBaseUrl,
    SPL_VAPI.MARKET_META_ASSET(assetName)
  )) as { data?: { details?: MarketplaceAssetMetaDetailRaw[] } } | null;
  return (body?.data?.details ?? []).map(normalizeMarketplaceAssetMetaDetail);
}

/** The player's own marketplace listings across every asset type. */
export async function fetchMarketplacePlayerAllListings(
  player: string
): Promise<MarketplacePlayerListing[]> {
  const body = (await vapiGet(SPL_VAPI.MARKET_PLAYER_ALL_LISTINGS, {
    player: player.trim().toLowerCase(),
  })) as { data?: MarketplacePlayerListingRaw[] } | null;
  return (body?.data ?? []).flatMap((listing) => {
    try {
      return [normalizeMarketplacePlayerListing(listing)];
    } catch {
      return [];
    }
  });
}

/** The player's owned skins with active state per card (`/players/skins`). */
export async function fetchPlayerSkins(username: string): Promise<SplSkin[]> {
  const data = await apiGet(SPL_API.PLAYER_SKINS, { username: username.trim().toLowerCase() });
  if (!Array.isArray(data)) throw new Error("Invalid player skins response");
  return data as SplSkin[];
}

/** Live listings for land deeds of the given detail ids (one page, with `total`). */
export function fetchDeedListingsPage(detailIds: string[]): Promise<MarketplaceListingItemsPage> {
  return fetchListingItemsPage({ assetName: "DEEDS", detailIds });
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/** `null` while SPL hasn't indexed the tx yet. */
export async function fetchTransactionLookupInBrowser(
  txId: string
): Promise<SplTransactionLookupResponse | null> {
  return normalizeTransactionLookup(await apiGet(SPL_API.TRANSACTION_LOOKUP, { trx_id: txId }));
}
