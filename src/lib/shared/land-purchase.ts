import { type CheapestListingSelection, toUsdUnitPrice } from "@/lib/shared/marketplace-assets";
import { buildPricedMarketplacePurchase } from "@/lib/shared/marketplace-purchase";
import { validatePositiveInteger } from "@/lib/shared/transactions-builder";
import type { MarketplaceListingItemsPage } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import type { MarketplacePurchasePayload } from "@/types/skin-transactions";
import type { SplBalance } from "@/types/spl/balances";

/** Same per-transaction cap the card checkout uses. */
export const MAX_LAND_ITEMS_PER_TX = 100;

/** Float noise allowance when comparing a live USD price with the quoted one. */
const PRICE_EPSILON_USD = 0.0005;

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

/** Validate the cart request; returns the deed detail ids to look up live listings for. */
export function validateLandPurchaseRequest(
  currency: PurchaseCurrency,
  items: LandPurchaseRequestItem[]
): string[] {
  if (currency !== "DEC" && currency !== "CREDITS") {
    throw new Error("Unsupported currency");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No land listings selected");
  }
  if (items.length > MAX_LAND_ITEMS_PER_TX) {
    throw new Error(`At most ${MAX_LAND_ITEMS_PER_TX} land listings per purchase`);
  }

  for (const item of items) {
    validatePositiveInteger(item.listingItemId, "Listing id");
    validatePositiveInteger(item.detailId, "Deed detail id");
    if (!Number.isFinite(item.priceUsd) || item.priceUsd <= 0) {
      throw new Error("Invalid listing price");
    }
  }

  return Array.from(new Set(items.map((item) => String(item.detailId))));
}

/**
 * Build an `sm_marketplace_purchase` payload for specific land deed listings.
 *
 * Every listing is re-checked against the live listing page (the cart may be
 * minutes old): it must still be listed, not be the buyer's own, and not cost
 * more than the price the buyer accepted. Pricing, DEC buffering and the
 * balance check are shared with the asset marketplace purchase.
 */
export function buildLandPurchase(args: {
  account: string;
  currency: PurchaseCurrency;
  items: LandPurchaseRequestItem[];
  listingPage: MarketplaceListingItemsPage;
  balances: SplBalance[];
  decPriceUsd: number;
}): LandPurchasePayloadResult {
  const requested = new Map(args.items.map((item) => [item.listingItemId, item]));

  // The endpoint currently returns every listing for the requested terrains in
  // one page. If it ever truncates, a missing listing would be indistinguishable
  // from a sold one — refuse rather than wrongly drop it from the cart.
  const listings = args.listingPage.items;
  if (args.listingPage.total > listings.length) {
    throw new Error("Could not verify all land listings right now. Please try again.");
  }

  const liveById = new Map(listings.map((listing) => [listing.listingItemId, listing]));
  const unavailable: number[] = [];
  const priceChanged: number[] = [];
  const selectionItems: CheapestListingSelection["items"] = [];

  for (const item of requested.values()) {
    const live = liveById.get(item.listingItemId);
    const liveUsd = live ? toUsdUnitPrice(live) : null;
    const isOwn = live?.seller.trim().toLowerCase() === args.account;

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
    decPriceUsd: args.decPriceUsd,
    balances: args.balances,
  });

  return { ok: true, payload, estimatedCost };
}
