"use server";

import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { getCachedLandMarket, getCachedOwnedLandRegions } from "@/lib/backend/cache/spl-cache";
import type { LandMarketData, LandOwnedRegion } from "@/types/land/landMarket";
import { updateTag } from "next/cache";

/** A manual refresh never re-hits SPL if the shared cache is younger than this. */
const MIN_MANUAL_REFRESH_AGE_MS = 15_000;

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
