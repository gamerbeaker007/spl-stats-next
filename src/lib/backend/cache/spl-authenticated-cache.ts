"use server";

import { fetchBrawlDetails, fetchDailyProgress } from "@/lib/backend/api/spl/spl-authenticated-api";
import { getDecryptedJwt, MissingJwtError } from "@/lib/backend/auth/jwt";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { LandHarvestData } from "@/types/land/landHarvest";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { cacheLife, cacheTag } from "next/cache";
import { fetchLandProductionOverview } from "../api/spl/spl-authenticated-vapi";

/**
 * Cached wrappers for token-authenticated SPL endpoints.
 *
 * The JWT is resolved *inside* the cached function on purpose — passing it as an
 * argument would make the token part of the cache key and persist it in the
 * cache store. Callers must still do the authorization check
 * (`assertMonitorsAccount`) before calling these.
 *
 * These functions **throw** rather than return an empty result when the token is
 * missing or every authenticated request failed. Next does not write a cache
 * entry for a throwing `"use cache"` function, so an unauthenticated outcome can
 * never be persisted for the cache window. Callers gate with `resolveUsableJwt`
 * first and map `MissingJwtError` to a "needs re-auth" result.
 */

/**
 * Daily progress across all three formats.
 *
 * Progress advances per battle, so this stays on the short `minutes` profile;
 * the win counters would look wrong if held longer. Collapses three upstream
 * requests into one cached entry per account.
 */
export async function getCachedDailyProgress(username: string): Promise<DailyProgressData> {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splDailyProgress(normalized));

  const token = await getDecryptedJwt(normalized);
  if (!token) throw new MissingJwtError(normalized);

  const [modern, wild, foundation] = await Promise.allSettled([
    fetchDailyProgress(normalized, token, "modern"),
    fetchDailyProgress(normalized, token, "wild"),
    fetchDailyProgress(normalized, token, "foundation"),
  ]);

  // All three rejected — almost always an expired/revoked token. Throwing keeps
  // the empty result out of the cache; returning it would render as
  // "no daily progress" for the whole cache window.
  if (
    modern.status === "rejected" &&
    wild.status === "rejected" &&
    foundation.status === "rejected"
  ) {
    throw modern.reason instanceof Error ? modern.reason : new Error(String(modern.reason));
  }

  return {
    username: normalized,
    timestamp: new Date().toISOString(),
    format: {
      modern: modern.status === "fulfilled" ? modern.value : undefined,
      wild: wild.status === "fulfilled" ? wild.value : undefined,
      foundation: foundation.status === "fulfilled" ? foundation.value : undefined,
    },
  };
}

/**
 * Brawl details for the player's guild + current brawl.
 *
 * A brawl runs for days, but per-player fray results land during it, so the
 * short `minutes` profile is used rather than `hours`.
 */
export async function getCachedBrawlDetails(
  username: string,
  guildId: string,
  tournamentId: string,
  authenticated: boolean
) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splBrawl(normalized));

  // `authenticated` is part of the cache key on purpose (the token itself never
  // is): the authenticated response carries `frays`, the public one does not, so
  // they must not share an entry — otherwise one tokenless fetch hides fray
  // selection for the whole cache window even after a successful re-auth.
  const token = authenticated ? await getDecryptedJwt(normalized) : undefined;
  if (authenticated && !token) throw new MissingJwtError(normalized);

  return fetchBrawlDetails(guildId, tournamentId, normalized, token);
}

/**
 * Per-region last_claimed timestamps from the land production overview.
 *
 * Land harvests are infrequent (players are advised every 7 days), so an
 * hourly cache avoids hitting the SPL VAPI on every dashboard mount while
 * keeping the data fresh enough to be actionable.
 */
export async function getCachedLandHarvestData(username: string): Promise<LandHarvestData> {
  "use cache";
  cacheLife("hours");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splLandHarvest(normalized));

  const token = await getDecryptedJwt(normalized);
  if (!token) throw new MissingJwtError(normalized);

  const regions = await fetchLandProductionOverview(normalized, token);
  return {
    username: normalized,
    regions: regions.map((r) => ({
      name: r.name,
      region_number: r.region_number,
      region_uid: r.region_uid,
      last_claimed: r.last_claimed ?? null,
    })),
    fetchedAt: new Date().toISOString(),
  };
}
