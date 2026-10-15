"use server";

import {
  fetchPeakMonsterPrices,
  fetchPeakMonsterTopBids,
} from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchFrontierDrawsPrizeOverview,
  fetchFrontierDrawsRecentPrizes,
  fetchJackPotGold,
  fetchMintHistory,
  fetchMintHistoryByDate,
  fetchPackJackpotOverview,
  fetchRankedDrawsPrizeOverview,
  fetchRankedDrawsRecentPrizes,
} from "@/lib/backend/api/spl/spl-api";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import type { CachedData } from "@/types/jackpot-prizes/freshness";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Shared server cache for the public jackpot-prizes data. Every visitor reads the
 * same entry, so SPL / PeakMonsters are hit at most once per endpoint per window
 * instead of once per page view. The raw fetch* functions throw on failure, and
 * thrown errors are not cached.
 */
const JACKPOT_CACHE_LIFE = { stale: 900, revalidate: 900, expire: 3600 };

export async function getCachedPackJackpotOverview(edition: number) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchPackJackpotOverview(edition);
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedRankedDrawsOverview() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchRankedDrawsPrizeOverview();
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedFrontierDrawsOverview() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchFrontierDrawsPrizeOverview();
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedCaGoldRewards() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchJackPotGold();
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

/** Recent prizes for one foil: ranked draws (18), frontier draws (15) or mint history by date. */
export async function getCachedRecentPrizes(edition: number, foil: number) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data =
    edition === 18
      ? await fetchRankedDrawsRecentPrizes(foil)
      : edition === 15
        ? await fetchFrontierDrawsRecentPrizes(foil)
        : await fetchMintHistoryByDate(foil, edition);
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedMintHistory(foil: number, cardId: number) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchMintHistory(foil, cardId);
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedPeakMonsterPrices() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchPeakMonsterPrices();
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}

export async function getCachedPeakMonsterTopBids() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  const data = await fetchPeakMonsterTopBids();
  return { data, fetchedAt: new Date().toISOString() } satisfies CachedData<typeof data>;
}
