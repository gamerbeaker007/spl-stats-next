"use server";

import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { getCachedLandMarket } from "@/lib/backend/cache/spl-cache";
import type { LandMarketData } from "@/types/land/landMarket";
import { updateTag } from "next/cache";

/** A manual refresh never re-hits SPL if the shared cache is younger than this. */
const MIN_MANUAL_REFRESH_AGE_MS = 15_000;

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
