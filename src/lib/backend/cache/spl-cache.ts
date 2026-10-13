"use server";

import { fetchPeakmonstersMarketPrices } from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchCardCollection,
  fetchCardDetails,
  fetchMarketForSaleGrouped,
  fetchPlayerDetails,
  fetchSettings,
  fetchSplMetrics,
  fetchSplPrices,
} from "@/lib/backend/api/spl/spl-api";
import { fetchLandMarketDeeds } from "@/lib/backend/api/spl/vapi-spl";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { getPlayerPoolBalances } from "@/lib/backend/services/pool-balances";
import { LAND_MARKET_STALE_SECONDS, normalizeLandMarketDeeds } from "@/lib/shared/land-market";
import { MARKET_PRICE_REFRESH_SECONDS } from "@/lib/shared/market-refresh";
import type { LandMarketData } from "@/types/land/landMarket";
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

export async function getCachedSplCardCollection(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splCollection(normalized));
  return fetchCardCollection(normalized);
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
  return fetchMarketForSaleGrouped();
}

/**
 * Token USD prices (prices.splinterlands.com) for previews and display. Same
 * window as the market price polling: SPL is hit at most once per half minute
 * however many dialogs are open. Payload builders that convert a broadcast
 * amount keep calling `fetchSplPrices()` directly for the live rate.
 */
export async function getCachedSplPrices() {
  "use cache";
  cacheLife({
    stale: MARKET_PRICE_REFRESH_SECONDS,
    revalidate: MARKET_PRICE_REFRESH_SECONDS / 2,
    expire: MARKET_PRICE_REFRESH_SECONDS,
  });
  cacheTag(CACHE_TAGS.splPrices);
  return fetchSplPrices();
}

/** Game-wide metrics (`/transactions/metrics`): daily data points, shared by every visitor. */
export async function getCachedSplMetrics() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.splMetrics);
  return fetchSplMetrics();
}

/**
 * A player's join date never changes, so it is cached for as long as Next keeps
 * the entry, so the metrics join-date picker doesn't refetch the full details payload.
 */
export async function getCachedSplJoinDate(username: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const details = await fetchPlayerDetails(username.trim().toLowerCase());
  return details.join_date ?? null;
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

/**
 * Every market-listed land deed, normalized once per refresh (JSON-in-string
 * fields parsed, artwork resolved) so no visitor re-processes the ~2.5k rows.
 * One shared entry for all visitors: SPL is hit at most once per minute.
 * Stale-while-revalidate keeps serving the previous list while a refresh runs.
 */
export async function getCachedLandMarket(): Promise<LandMarketData> {
  "use cache";
  cacheLife({
    stale: LAND_MARKET_STALE_SECONDS,
    revalidate: LAND_MARKET_STALE_SECONDS,
    expire: LAND_MARKET_STALE_SECONDS * 5,
  });
  cacheTag(CACHE_TAGS.splLandMarket);
  const rows = await fetchLandMarketDeeds();
  return { listings: normalizeLandMarketDeeds(rows), fetchedAt: new Date().toISOString() };
}
