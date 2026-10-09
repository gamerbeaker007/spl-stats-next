"use server";

import {
  fetchPeakMonsterPrices,
  fetchPeakMonsterTopBids,
} from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchCardHistory,
  fetchFrontierDrawsPrizeOverview,
  fetchFrontierDrawsRecentPrizes,
  fetchFrontierJackpotMusic,
  fetchJackPotGold,
  fetchJackPotSkins,
  fetchJackpotMusic,
  fetchMinorJackpotSkins,
  fetchMintHistory,
  fetchMintHistoryByDate,
  fetchPackJackpotOverview,
  fetchRankedDrawsPrizeOverview,
  fetchRankedDrawsRecentPrizes,
} from "@/lib/backend/api/spl/spl-api";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
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
  return fetchPackJackpotOverview(edition);
}

export async function getCachedRankedDrawsOverview() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchRankedDrawsPrizeOverview();
}

export async function getCachedFrontierDrawsOverview() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchFrontierDrawsPrizeOverview();
}

export async function getCachedCaGoldRewards() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchJackPotGold();
}

export async function getCachedJackpotSkins() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchJackPotSkins();
}

export async function getCachedMinorJackpotSkins() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchMinorJackpotSkins();
}

export async function getCachedJackpotMusic() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchJackpotMusic();
}

export async function getCachedFrontierJackpotMusic() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchFrontierJackpotMusic();
}

/** Recent prizes for one foil: ranked draws (18), frontier draws (15) or mint history by date. */
export async function getCachedRecentPrizes(edition: number, foil: number) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  if (edition === 18) return fetchRankedDrawsRecentPrizes(foil);
  if (edition === 15) return fetchFrontierDrawsRecentPrizes(foil);
  return fetchMintHistoryByDate(foil, edition);
}

export async function getCachedMintHistory(foil: number, cardId: number) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchMintHistory(foil, cardId);
}

export async function getCachedCardHistory(uid: string) {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchCardHistory(uid);
}

export async function getCachedPeakMonsterPrices() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchPeakMonsterPrices();
}

export async function getCachedPeakMonsterTopBids() {
  "use cache";
  cacheLife(JACKPOT_CACHE_LIFE);
  cacheTag(CACHE_TAGS.splJackpot);
  return fetchPeakMonsterTopBids();
}
