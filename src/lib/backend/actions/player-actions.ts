"use server";

import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { fetchPlayerHistoryByDateRange } from "@/lib/backend/api/spl/spl-authenticated-api";
import { isAuthFailure } from "@/lib/backend/api/spl/spl-errors";
import { MissingJwtError, resolveUsableJwt, type JwtResolution } from "@/lib/backend/auth/jwt";
import {
  getCachedBrawlDetails,
  getCachedDailyProgress,
  getCachedLandHarvestData,
} from "@/lib/backend/cache/spl-authenticated-cache";
import {
  getCachedPeakmonstersMarketPrices,
  getCachedPlayerPoolBalances,
  getCachedSplCardCollection,
  getCachedSplCardDetails,
  getCachedSplListingPrices,
  getCachedSplPlayerBalances,
  getCachedSplPlayerDetails,
  getCachedSplPlayerDraws,
  getCachedSplSeasonRewards,
} from "@/lib/backend/cache/spl-cache";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getAllSeasons, getLatestSeason, getSeasonById } from "@/lib/backend/db/seasons";
import { rethrowFrameworkErrors } from "@/lib/backend/next-errors";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import { getPlayerCollectionValue } from "@/lib/collectionUtils";
import {
  aggregatePurchaseRewards,
  aggregateRewards,
  mergeRewardSummaries,
} from "@/lib/rewardAggregator";
import {
  authError,
  authNeedsReAuth,
  authOk,
  authPartial,
  type AuthenticatedResult,
} from "@/lib/shared/authenticated-result";
import { DetailedPlayerCardCollection } from "@/types/card";
import { LandHarvestData } from "@/types/land/landHarvest";
import { ParsedHistory, ParsedPlayerRewardHistory, PurchaseResult } from "@/types/parsedHistory";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { SeasonBalanceHistory, TokenBalanceSummary } from "@/types/spl/balanceHistory";
import { PlayerPoolBalances } from "@/types/spl/balances";
import { SplBrawlDetails } from "@/types/spl/brawl";
import { getCurrentUser, getMonitoredAccounts } from "./auth-actions";

// ---------------------------------------------------------------------------
// Public actions (no token required)
//
// All reads go through the `"use cache"` wrappers in `cache/spl-cache.ts` so
// repeated dashboard mounts and multiple accounts share cached data instead of
// hitting Splinterlands on every render.
// ---------------------------------------------------------------------------

export async function getPlayerDetails(username: string) {
  return getCachedSplPlayerDetails(username);
}

export async function getPlayerBalances(username: string) {
  return getCachedSplPlayerBalances(username);
}

export async function getPlayerDraws(username: string) {
  return getCachedSplPlayerDraws(username);
}

export async function getPlayerSeasonRewards(username: string) {
  return getCachedSplSeasonRewards(username);
}

/** Underlying DEC/SPS held in the player's DEC-SPS liquidity pool positions. */
export async function getPlayerPoolBalances(username: string): Promise<PlayerPoolBalances> {
  return getCachedPlayerPoolBalances(username);
}

export async function getCardDetails() {
  return getCachedSplCardDetails();
}

// ---------------------------------------------------------------------------
// Actions that use the player's stored token when available
// ---------------------------------------------------------------------------

async function assertMonitorsAccount(username: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const accounts = await getMonitoredAccounts();
  return accounts.some((a) => a.username === username.toLowerCase());
}

/**
 * Run a token-dependent read behind two gates: the caller must monitor the
 * account, and the stored JWT must still be usable.
 *
 * The expiry gate runs *outside* the `"use cache"` wrappers on purpose — no
 * authenticated request is issued for a dead token (so no 401/403), and no
 * unauthenticated outcome can be written into the cache.
 */
async function withUsableJwt<T>(
  username: string,
  run: (resolution: Extract<JwtResolution, { ok: true }>) => Promise<T>
): Promise<AuthenticatedResult<T>> {
  if (!(await assertMonitorsAccount(username))) {
    return authError("Account is not in your monitored list");
  }

  const resolution = await resolveUsableJwt(username);
  if (!resolution.ok) {
    return authNeedsReAuth(resolution.reason, resolution.jwtExpiresAt);
  }

  try {
    return authOk(await run(resolution));
  } catch (error) {
    rethrowFrameworkErrors(error);
    // The token was revoked between the gate and the (uncached) fetch.
    if (error instanceof MissingJwtError) return authNeedsReAuth("no_token", null);
    // Revoked but not yet expired: the expiry gate cannot see this, only SPL can.
    if (isAuthFailure(error)) return authNeedsReAuth("token_expired", null);
    return authError(error instanceof Error ? error.message : "Request failed");
  }
}

/**
 * Brawl details. Degrades to the public (tokenless) response when the JWT is
 * unusable — cycle/status/battles stay visible, only fray selection is missing —
 * so this returns `partial` rather than refusing outright.
 */
export async function getPlayerBrawl(
  username: string,
  guildId: string,
  tournamentId: string
): Promise<AuthenticatedResult<SplBrawlDetails>> {
  if (!(await assertMonitorsAccount(username))) {
    return authError("Account is not in your monitored list");
  }

  const resolution = await resolveUsableJwt(username);

  try {
    const details = await getCachedBrawlDetails(username, guildId, tournamentId, resolution.ok);
    return resolution.ok
      ? authOk(details)
      : authPartial(details, resolution.reason, resolution.jwtExpiresAt);
  } catch (error) {
    rethrowFrameworkErrors(error);
    return authError(error instanceof Error ? error.message : "Failed to fetch brawl details");
  }
}

export async function getPlayersDailyProgress(
  username: string
): Promise<AuthenticatedResult<DailyProgressData>> {
  return withUsableJwt(username, () => getCachedDailyProgress(username));
}

export async function getPlayersCardCollection(
  username: string
): Promise<PlayerCardCollectionData> {
  const [collection, listPrices, marketPrices] = await Promise.all([
    getCachedSplCardCollection(username),
    getCachedSplListingPrices(),
    getCachedPeakmonstersMarketPrices(),
  ]);
  const playerCollectionValue = await getPlayerCollectionValue(
    collection,
    listPrices,
    marketPrices
  );
  return {
    username,
    date: new Date().toISOString(),
    collectionPower: collection.collection_power,
    playerCollectionValue,
  };
}

// ---------------------------------------------------------------------------
// Force refresh (per account)
// ---------------------------------------------------------------------------

/**
 * Expire every cached dashboard read for a single monitored account so the next
 * fetch goes to Splinterlands. Scoped per account on purpose — refreshing one
 * card must not invalidate the other accounts' cached data.
 *
 * Returns `false` when the caller does not monitor `username`.
 */
export async function forceRefreshDashboardAccount(username: string): Promise<boolean> {
  if (!(await assertMonitorsAccount(username))) return false;
  await revalidateTagsAction([{ type: "dashboard-account", usernames: [username] }]);
  return true;
}

/** Cached land harvest data for the player's monitored account. */
export async function getPlayerLandHarvest(
  username: string
): Promise<AuthenticatedResult<LandHarvestData>> {
  return withUsableJwt(username, () => getCachedLandHarvestData(username));
}

export async function getDetailedPlayerCardCollection(
  username: string
): Promise<DetailedPlayerCardCollection> {
  return getDetailedPlayerCardCollectionCached(username);
}

// ---------------------------------------------------------------------------
// Season date lookup (reads from DB)
// ---------------------------------------------------------------------------

export async function getLatestSeasonAction() {
  return getLatestSeason();
}

export async function getAllSeasonsAction() {
  return getAllSeasons();
}

// ---------------------------------------------------------------------------
// Balance summary from DB (reads SeasonBalance table, no API call)
// ---------------------------------------------------------------------------

export async function getSeasonBalanceSummary(
  username: string,
  seasonId: number
): Promise<SeasonBalanceHistory> {
  const rows = await getSeasonBalances(username, seasonId);

  // Group rows by token and aggregate
  const byToken = new Map<string, TokenBalanceSummary>();
  for (const row of rows) {
    if (!byToken.has(row.token)) {
      byToken.set(row.token, {
        token: row.token,
        totalEarned: 0,
        totalSpent: 0,
        net: 0,
        byType: {},
      });
    }
    const entry = byToken.get(row.token)!;
    entry.totalEarned += row.earned;
    entry.totalSpent += row.cost;
    entry.net += row.earned - row.cost;
    entry.byType[row.type] = {
      earned: (entry.byType[row.type]?.earned ?? 0) + row.earned,
      spent: (entry.byType[row.type]?.spent ?? 0) + row.cost,
      count: (entry.byType[row.type]?.count ?? 0) + row.count,
    };
  }

  return { seasonId, summaries: Array.from(byToken.values()) };
}

// ---------------------------------------------------------------------------
// Reward history for a season (API fetch by date range)
// ---------------------------------------------------------------------------

const REWARD_HISTORY_TYPES = "claim_reward,claim_daily,purchase";

export async function getPlayerSeasonHistory(
  username: string,
  seasonId: number
): Promise<AuthenticatedResult<ParsedPlayerRewardHistory>> {
  const [season, prevSeason] = await Promise.all([
    getSeasonById(seasonId),
    getSeasonById(seasonId - 1),
  ]);
  // Reported as an error, not as "needs re-auth" — a missing season row is not
  // something re-authenticating can fix.
  if (!season) return authError(`Season ${seasonId} not found`);
  const endDate = new Date(season.endsAt);
  const startDate = prevSeason ? new Date(prevSeason.endsAt) : new Date(0);

  return withUsableJwt(username, async ({ token }) => {
    const allHistory: ParsedHistory[] = await fetchPlayerHistoryByDateRange(
      username,
      token,
      REWARD_HISTORY_TYPES,
      startDate,
      endDate
    );

    const purchaseEntries = allHistory
      .filter(
        (e): e is ParsedHistory & { type: "purchase"; result: PurchaseResult } =>
          e.type === "purchase" && e.result !== null
      )
      .map((e) => e.result as PurchaseResult);

    const aggregation = mergeRewardSummaries(
      aggregateRewards(allHistory),
      aggregatePurchaseRewards(purchaseEntries)
    );

    return {
      allEntries: allHistory,
      totalEntries: allHistory.length,
      seasonId,
      aggregation,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  });
}
