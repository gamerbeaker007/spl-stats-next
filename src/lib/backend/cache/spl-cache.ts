"use server";

import { fetchPeakmonstersMarketPrices } from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchAccountSkins,
  fetchCardCollection,
  fetchCardDetails,
  fetchCurrentRewards,
  fetchFrontierDraws,
  fetchListingPrices,
  fetchMarketForSaleGrouped,
  fetchPlayerBalances,
  fetchPlayerDetails,
  fetchPlayerInventory,
  fetchRankedDraws,
  fetchSettings,
} from "@/lib/backend/api/spl/spl-api";
import {
  fetchMarketplaceAssets,
  fetchMarketplacePlayerAllListings,
} from "@/lib/backend/api/spl/vapi-spl";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { getPlayerPoolBalances } from "@/lib/backend/services/pool-balances";
import type {
  MarketplaceAssetItem,
  MarketplaceAssetName,
  MarketplacePlayerListing,
} from "@/types/marketplace-assets";
import { cacheLife, cacheTag } from "next/cache";

export async function getCachedSplSettings() {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.splSettings);
  return fetchSettings();
}

export async function getCachedSplMaintenanceSettings() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 60, expire: 300 });
  cacheTag(CACHE_TAGS.splMaintenance);
  return fetchSettings();
}

export async function getCachedSplCardDetails() {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.splCardDetails);
  return fetchCardDetails();
}

export async function getCachedSplGroupedMarket() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.splGroupedMarket);
  return fetchMarketForSaleGrouped();
}

export async function getCachedSplCardCollection(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splCollection(normalized));
  return fetchCardCollection(normalized);
}

/**
 * Player balances (`/players/balances`).
 *
 * Deliberately kept on the short `minutes` profile even though most tokens in
 * the payload (DEC, SPS, SPSP, CREDITS, GLINT, …) change slowly: the same
 * response carries `ECR`/`FECR`, from which the dashboard derives ranked and
 * frontier **energy**. Energy is consumed per battle, so a stale ECR reading
 * would show energy that the player no longer has. One response feeds both, so
 * the strictest freshness requirement wins.
 */
export async function getCachedSplPlayerBalances(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splBalances(normalized));
  return fetchPlayerBalances(normalized);
}

/**
 * Player details (`/players/details`) — league, rating, season battle counts.
 * Changes with every battle, so short-lived.
 */
export async function getCachedSplPlayerDetails(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splPlayerDetails(normalized));
  return fetchPlayerDetails(normalized);
}

/**
 * Ranked + frontier draw status. Reflects claimable draws, so short-lived.
 */
export async function getCachedSplPlayerDraws(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splDraws(normalized));
  const [ranked, frontier] = await Promise.all([
    fetchRankedDraws(normalized),
    fetchFrontierDraws(normalized),
  ]);
  return { ranked, frontier };
}

/**
 * Current-season reward progress (glint per format). Accrues per battle.
 */
export async function getCachedSplSeasonRewards(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splSeasonRewards(normalized));
  return fetchCurrentRewards(normalized);
}

/**
 * Underlying DEC/SPS in the player's DEC-SPS liquidity pool positions.
 *
 * Pool positions only change when the player adds/removes liquidity, and the
 * pool's own reserves drift slowly, so an hourly cache is ample. Four upstream
 * requests (2 vAPI + 2 Hive Engine RPC) collapse into one cached entry per
 * account.
 */
export async function getCachedPlayerPoolBalances(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splPoolBalances(normalized));
  return getPlayerPoolBalances(normalized);
}

/**
 * Global card listing prices. Not account-specific — caching this collapses one
 * fetch per dashboard card into a single fetch shared by every account.
 */
export async function getCachedSplListingPrices() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.splListingPrices);
  return fetchListingPrices();
}

/**
 * Global PeakMonsters market prices. Same rationale as listing prices.
 */
export async function getCachedPeakmonstersMarketPrices() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.splMarketPrices);
  return fetchPeakmonstersMarketPrices();
}

export async function getCachedSplPlayerInventory(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splMarketplace(normalized));
  return fetchPlayerInventory(normalized);
}

/**
 * Marketplace landing assets (ownership counts + lowest prices) for a player.
 * Cached for minutes and tagged per account so a buy/list/transfer/delist can
 * invalidate it via `revalidateTagsAction([{ type: "marketplace", ... }])`.
 */
export async function getCachedMarketplaceAssets(
  username: string,
  assetName: MarketplaceAssetName
): Promise<MarketplaceAssetItem[]> {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splMarketplace(normalized));

  return fetchMarketplaceAssets(normalized, assetName);
}

/**
 * Player's own marketplace listings across all marketplace asset types.
 * Cached with the same tag/lifetime as marketplace landing assets because these
 * quantities are part of marketplace ownership for quantity-based assets.
 */
export async function getCachedMarketplacePlayerAllListings(
  username: string
): Promise<MarketplacePlayerListing[]> {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splMarketplace(normalized));

  return fetchMarketplacePlayerAllListings(normalized);
}

/**
 * Player's owned skins from `/players/skins`.
 * Cached for minutes and tagged per account so buy/transfer/list/delist/activate
 * actions can invalidate it via `revalidateTagsAction([{ type: "player-skins", ... }])`.
 */
export async function getCachedPlayerSkins(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splPlayerSkins(normalized));

  return fetchAccountSkins(normalized);
}
