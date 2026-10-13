"use client";

import { useDecPriceUsd } from "@/hooks/collection/useDecPriceUsd";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import type { LandMarketListing } from "@/types/land/landMarket";
import {
  isLandPurchaseItem,
  landCartMarketId,
  type LandPurchasePlanItem,
} from "@/types/purchase/purchase-plan";
import { useCallback, useMemo } from "react";

export interface LandCartState {
  /** Account holding this listing in the cart, or `null` when not in the cart. */
  inCartFor: string | null;
  /** Why the listing cannot be added right now, or `null` when it can. */
  blockedReason: string | null;
}

function toCartItem(
  listing: LandMarketListing,
  account: string,
  decPriceUsd: number
): LandPurchasePlanItem {
  return {
    kind: "land",
    account,
    marketId: landCartMarketId(listing.listingItemId),
    listingItemId: listing.listingItemId,
    detailId: listing.detailId,
    deedUid: listing.deedUid,
    location: listing.location,
    regionName: listing.regionName,
    rarity: listing.rarity,
    terrain: listing.terrain,
    landType: listing.landType,
    imageUrl: listing.imageUrl,
    seller: listing.seller,
    priceUsd: listing.priceUsd,
    // Preview only — checkout re-prices at the live DEC rate server side.
    priceDec: Number((listing.priceUsd / decPriceUsd).toFixed(3)),
    // Credits are pegged at 1000 per USD (same as `priceSelectionInCurrency`).
    priceCredits: Number((listing.priceUsd * 1000).toFixed(3)),
  };
}

/**
 * Land listings in the shared purchase cart for the selected account. Each deed
 * is a unique quantity-1 listing; the cart's `marketId` dedupe keeps a listing
 * reserved for one buyer account at a time.
 */
export function useLandCart(account: string | null) {
  const { items, addItems, removeItem } = usePurchasePlan();
  const { decPriceUsd } = useDecPriceUsd();
  const normalizedAccount = (account ?? "").trim().toLowerCase();

  const cartAccountByMarketId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (isLandPurchaseItem(item)) map.set(item.marketId, item.account);
    }
    return map;
  }, [items]);

  const getState = useCallback(
    (listing: LandMarketListing): LandCartState => {
      const inCartFor = cartAccountByMarketId.get(landCartMarketId(listing.listingItemId)) ?? null;
      let blockedReason: string | null = null;
      if (!normalizedAccount) blockedReason = "Select an account to buy";
      else if (listing.seller.toLowerCase() === normalizedAccount)
        blockedReason = "This is your own listing";
      else if (decPriceUsd === null) blockedReason = "Live DEC price unavailable";
      return { inCartFor, blockedReason };
    },
    [cartAccountByMarketId, decPriceUsd, normalizedAccount]
  );

  const toggle = useCallback(
    (listing: LandMarketListing) => {
      const marketId = landCartMarketId(listing.listingItemId);
      const holder = cartAccountByMarketId.get(marketId);
      if (holder) {
        removeItem(holder, marketId);
        return;
      }
      if (!normalizedAccount || decPriceUsd === null) return;
      if (listing.seller.toLowerCase() === normalizedAccount) return;
      addItems([toCartItem(listing, normalizedAccount, decPriceUsd)]);
    },
    [addItems, cartAccountByMarketId, decPriceUsd, normalizedAccount, removeItem]
  );

  return { getState, toggle, decPriceUsd };
}
