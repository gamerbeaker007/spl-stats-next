export const CACHE_TAGS = {
  splSettings: "spl:settings",
  splMaintenance: "spl:maintenance",
  splCardDetails: "spl:card-details",
  splListingPrices: "spl:listing-prices",
  splMarketPrices: "spl:market-prices",
  splPrices: "spl:prices",
  splMetrics: "spl:metrics",
  splJackpot: "spl:jackpot",
  splLandMarket: "spl:land-market",
  splCollection: (username: string) => `spl:collection:${username.toLowerCase()}`,
  splPoolBalances: (username: string) => `spl:pool-balances:${username.toLowerCase()}`,
  splDailyProgress: (username: string) => `spl:daily-progress:${username.toLowerCase()}`,
  splBrawl: (username: string) => `spl:brawl:${username.toLowerCase()}`,
  splLandHarvest: (username: string) => `spl:land-harvest:${username.toLowerCase()}`,
} as const;

/**
 * Every per-account tag the multi-account dashboard reads from.
 * Used by the per-card force refresh so one account can be refreshed without
 * touching any other account's cached data.
 */
export function dashboardAccountTags(username: string): string[] {
  const normalized = username.trim().toLowerCase();
  return [
    CACHE_TAGS.splPoolBalances(normalized),
    CACHE_TAGS.splDailyProgress(normalized),
    CACHE_TAGS.splBrawl(normalized),
    CACHE_TAGS.splCollection(normalized),
    CACHE_TAGS.splLandHarvest(normalized),
  ];
}

export type CacheInvalidationTarget =
  | { type: "collection"; usernames: string[] }
  | { type: "card-details" }
  | { type: "settings" }
  | { type: "maintenance" }
  | { type: "land-market" }
  | { type: "portfolio"; usernames: string[] }
  | { type: "dashboard-account"; usernames: string[] };
