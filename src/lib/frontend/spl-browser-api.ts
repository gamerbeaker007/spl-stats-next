"use client";

import { getDecPriceUsdAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { toCardFoil, toCardFoilInt } from "@/lib/shared/card-utils";
import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import { normalizeMarketplaceListingItem } from "@/lib/shared/marketplace-assets";
import { normalizeTransactionLookup } from "@/lib/shared/trx-lookup-parser";
import type { CardFoil } from "@/types/card";
import type {
  FetchMarketplaceListingItemsParams,
  MarketplaceAssetName,
  MarketplaceListingItem,
  MarketplaceListingItemRaw,
  MarketplaceListingItemsPage,
} from "@/types/marketplace-assets";
import type {
  FetchMarketListingsByCardParams,
  SplMarketListing,
  SplMarketListingsResponse,
  SplTransactionLookupResponse,
} from "@/types/purchase/purchase-plan";
import type { SplBalance } from "@/types/spl/balances";
import type { SplInventoryItem } from "@/types/spl/jackpot";

/**
 * The only path for every "browser (live)" SPL data type (see CLAUDE.md):
 * balances, inventory, card + marketplace listings, and tx lookup. These reads
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

async function requestJson(baseUrl: string, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(BROWSER_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Splinterlands ${path} returned HTTP ${res.status}`);
  return res.json();
}

function apiGet(path: string, params: Record<string, string | number>): Promise<unknown> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  );
  return requestJson(splApiConfig.publicBaseUrl, `${path}?${query}`);
}

async function fetchListingItemsPage(
  params: FetchMarketplaceListingItemsParams
): Promise<MarketplaceListingItemsPage> {
  const body = (await requestJson(splApiConfig.vapiBaseUrl, "/market/listing-items", {
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
  const data = await apiGet("/players/balances", { username: account.trim().toLowerCase() });
  if (!Array.isArray(data)) throw new Error("Invalid balances response");
  return data as SplBalance[];
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

/** The account's live item inventory (uids with listed / in-use state). */
export async function fetchInventory(username: string): Promise<SplInventoryItem[]> {
  const data = await apiGet("/players/inventory", { username: username.trim().toLowerCase() });
  if (!Array.isArray(data)) throw new Error("Invalid inventory response");
  return data as SplInventoryItem[];
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
    apiGet("/market/market_query_by_card", params),
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
  return normalizeTransactionLookup(await apiGet("/transactions/lookup", { trx_id: txId }));
}
