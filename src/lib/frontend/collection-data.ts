"use client";

import { getCardDetails } from "@/lib/backend/actions/player-actions";
import { createBrowserCache } from "@/lib/frontend/browser-cache";
import { fetchCardCollection, fetchMarketForSaleGrouped } from "@/lib/frontend/spl-browser-api";
import { buildDetailedPlayerCardCollection } from "@/lib/shared/detailed-collection";
import { toMarketPriceMap } from "@/lib/shared/market-prices";
import type { DetailedPlayerCardCollection } from "@/types/card";
import type { SplCardCollection } from "@/types/spl/card";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { MarketPriceInfo } from "@/types/spl/market";

/**
 * Collection-page data loaders (cards, Buy Missing CC, buy dialog, skins). The
 * per-account collection and the market-wide grouped prices come straight from
 * SPL in the browser; card details are shared static data from the server cache.
 * Collection and card details are memoized per tab so pages and dialogs reuse
 * one request; grouped prices are not (always fetched live, polled once a minute).
 */

/** Long enough to share one fetch between the cards page, Buy Missing CC and the buy dialog. */
const COLLECTION_TTL_MS = 60_000;
/** Card details change only on new releases (server cache: days). */
const CARD_DETAILS_TTL_MS = 60 * 60_000;

const collectionCache = createBrowserCache<SplCardCollection>(COLLECTION_TTL_MS);
const cardDetailsCache = createBrowserCache<SplCardDetail[]>(CARD_DETAILS_TTL_MS);

/**
 * The account's `/cards/collection`. `refreshVersion` is the purchase plan's
 * `collectionRefreshVersion`: a bump (purchase, combine, manual refresh) skips
 * the memoized copy.
 */
export function loadCardCollection(
  username: string,
  refreshVersion: number
): Promise<SplCardCollection> {
  const normalized = username.trim().toLowerCase();
  return collectionCache(`${normalized}:${refreshVersion}`, () => fetchCardCollection(normalized));
}

export function loadCardDetails(): Promise<SplCardDetail[]> {
  return cardDetailsCache("all", () => getCardDetails());
}

export async function loadDetailedCollection(
  username: string,
  refreshVersion: number,
  ownedCardOnly = false
): Promise<DetailedPlayerCardCollection> {
  const [collection, cardDetails] = await Promise.all([
    loadCardCollection(username, refreshVersion),
    loadCardDetails(),
  ]);
  return buildDetailedPlayerCardCollection(username, collection, cardDetails, ownedCardOnly);
}

/** Edition-specific prices keyed by `${cardDetailId}-${edition}-${foilInt}`, fetched live. */
export async function loadMarketPrices(): Promise<{
  prices: Record<string, MarketPriceInfo>;
  fetchedAt: string;
}> {
  const entries = await fetchMarketForSaleGrouped();
  return { prices: toMarketPriceMap(entries), fetchedAt: new Date().toISOString() };
}
