"use server";

import { fetchPlayerBalances, fetchSplPrices } from "@/lib/backend/api/spl/spl-api";
import { fetchMarketplaceListingItemsPage } from "@/lib/backend/api/spl/vapi-spl";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { getCachedLandMarket, getCachedOwnedLandRegions } from "@/lib/backend/cache/spl-cache";
import { buildPricedMarketplacePurchase } from "@/lib/backend/services/marketplace-purchase";
import { type CheapestListingSelection, toUsdUnitPrice } from "@/lib/shared/marketplace-assets";
import { validatePositiveInteger } from "@/lib/shared/transactions-builder";
import type { LandMarketData, LandOwnedRegion } from "@/types/land/landMarket";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import type { MarketplacePurchasePayload } from "@/types/skin-transactions";
import { updateTag } from "next/cache";

/** A manual refresh never re-hits SPL if the shared cache is younger than this. */
const MIN_MANUAL_REFRESH_AGE_MS = 15_000;

/** Same per-transaction cap the card checkout uses. */
const MAX_LAND_ITEMS_PER_TX = 100;

/** Float noise allowance when comparing a live USD price with the quoted one. */
const PRICE_EPSILON_USD = 0.0005;

const HIVE_ACCOUNT_PATTERN = /^[a-z0-9][a-z0-9.-]{1,15}$/;

function normalizeAccount(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!HIVE_ACCOUNT_PATTERN.test(normalized)) {
    throw new Error("A valid account is required");
  }
  return normalized;
}

/** All market-listed land deeds (public data, shared server cache). */
export async function getLandMarketAction(): Promise<LandMarketData> {
  return getCachedLandMarket();
}

/**
 * Manual refresh. Expires the shared cache entry so this request reads fresh
 * SPL data — unless the entry is only seconds old, so repeated clicks (or a
 * scripted caller) cannot turn the button into an SPL request per call.
 */
export async function refreshLandMarketAction(): Promise<LandMarketData> {
  const cached = await getCachedLandMarket();
  const ageMs = Date.now() - Date.parse(cached.fetchedAt);
  if (Number.isFinite(ageMs) && ageMs < MIN_MANUAL_REFRESH_AGE_MS) {
    return cached;
  }

  updateTag(CACHE_TAGS.splLandMarket);
  return getCachedLandMarket();
}

/**
 * Regions the account owns plots in (public data, cached per account).
 * `fresh` expires the account's entry first — used after a land purchase, when
 * the stale-while-revalidate entry would otherwise still miss the new region.
 */
export async function getOwnedLandRegionsAction(
  account: string,
  fresh = false
): Promise<LandOwnedRegion[]> {
  const normalized = normalizeAccount(account);
  if (fresh) updateTag(CACHE_TAGS.splLandOwned(normalized));
  return getCachedOwnedLandRegions(normalized);
}

export interface LandPurchaseRequestItem {
  listingItemId: number;
  /** DEEDS marketplace detail id (`item_detail_id`) — scopes the live listing lookup. */
  detailId: number;
  /** USD price the buyer saw; the purchase is refused if the live price is higher. */
  priceUsd: number;
}

export type LandPurchasePayloadResult =
  | { ok: true; payload: MarketplacePurchasePayload; estimatedCost: number }
  | {
      ok: false;
      error: string;
      /** Sold, delisted, or the buyer's own listing — safe to drop from the cart. */
      unavailableListingItemIds: number[];
      /** Still listed but now more expensive than quoted. */
      priceChangedListingItemIds: number[];
    };

/**
 * Build an `sm_marketplace_purchase` payload for specific land deed listings.
 *
 * Every listing is re-checked against the live marketplace (the page data may
 * be up to a minute old): it must still be listed, not be the buyer's own, and
 * not cost more than the price the buyer accepted. Pricing, DEC buffering and
 * the balance check are shared with the asset marketplace purchase.
 */
export async function buildLandPurchasePayloadAction(args: {
  account: string;
  currency: PurchaseCurrency;
  items: LandPurchaseRequestItem[];
}): Promise<LandPurchasePayloadResult> {
  const account = normalizeAccount(args.account);
  if (args.currency !== "DEC" && args.currency !== "CREDITS") {
    throw new Error("Unsupported currency");
  }
  if (!Array.isArray(args.items) || args.items.length === 0) {
    throw new Error("No land listings selected");
  }
  if (args.items.length > MAX_LAND_ITEMS_PER_TX) {
    throw new Error(`At most ${MAX_LAND_ITEMS_PER_TX} land listings per purchase`);
  }

  const requested = new Map<number, LandPurchaseRequestItem>();
  for (const item of args.items) {
    validatePositiveInteger(item.listingItemId, "Listing id");
    validatePositiveInteger(item.detailId, "Deed detail id");
    if (!Number.isFinite(item.priceUsd) || item.priceUsd <= 0) {
      throw new Error("Invalid listing price");
    }
    requested.set(item.listingItemId, item);
  }

  const detailIds = Array.from(new Set(args.items.map((item) => String(item.detailId))));
  const [listingPage, balances, prices] = await Promise.all([
    fetchMarketplaceListingItemsPage({ assetName: "DEEDS", detailIds }),
    fetchPlayerBalances(account),
    fetchSplPrices(),
  ]);

  // The endpoint currently returns every listing for the requested terrains in
  // one page. If it ever truncates, a missing listing would be indistinguishable
  // from a sold one — refuse rather than wrongly drop it from the cart.
  const listings = listingPage.items;
  if (listingPage.total > listings.length) {
    throw new Error("Could not verify all land listings right now. Please try again.");
  }

  const liveById = new Map(listings.map((listing) => [listing.listingItemId, listing]));
  const unavailable: number[] = [];
  const priceChanged: number[] = [];
  const selectionItems: CheapestListingSelection["items"] = [];

  for (const item of requested.values()) {
    const live = liveById.get(item.listingItemId);
    const liveUsd = live ? toUsdUnitPrice(live) : null;
    const isOwn = live?.seller.trim().toLowerCase() === account;

    if (!live || liveUsd === null || live.quantityRemaining < 1 || isOwn) {
      unavailable.push(item.listingItemId);
      continue;
    }
    if (liveUsd > item.priceUsd + PRICE_EPSILON_USD) {
      priceChanged.push(item.listingItemId);
      continue;
    }
    selectionItems.push({ listingItemId: item.listingItemId, quantity: 1, costUsd: liveUsd });
  }

  if (unavailable.length > 0 || priceChanged.length > 0) {
    const parts: string[] = [];
    if (unavailable.length > 0) {
      parts.push(`${unavailable.length} listing(s) are no longer available`);
    }
    if (priceChanged.length > 0) {
      parts.push(`${priceChanged.length} listing(s) changed price`);
    }
    return {
      ok: false,
      error: `${parts.join(" and ")}. Nothing was purchased — review your cart and try again.`,
      unavailableListingItemIds: unavailable,
      priceChangedListingItemIds: priceChanged,
    };
  }

  const selection: CheapestListingSelection = {
    plan: new Map(selectionItems.map((item) => [item.listingItemId, item.quantity])),
    items: selectionItems,
    totalUsd: selectionItems.reduce((sum, item) => sum + item.costUsd, 0),
    fulfilled: true,
  };

  const { payload, estimatedCost } = buildPricedMarketplacePurchase({
    selection,
    currency: args.currency,
    decPriceUsd: prices.dec,
    balances,
  });

  return { ok: true, payload, estimatedCost };
}
