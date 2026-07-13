"use server";

import {
  fetchCardCollection,
  fetchCardDetails,
  fetchMarketForSaleGrouped,
  fetchPlayerBalances,
  fetchPlayerInventory,
  fetchSettings,
} from "@/lib/backend/api/spl/spl-api";
import { fetchMarketplaceAssets } from "@/lib/backend/api/spl/vapi-spl";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
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

export async function getCachedSplPlayerBalances(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splBalances(normalized));
  return fetchPlayerBalances(normalized);
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
