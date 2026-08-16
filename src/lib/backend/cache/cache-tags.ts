export const CACHE_TAGS = {
  splSettings: "spl:settings",
  splMaintenance: "spl:maintenance",
  splCardDetails: "spl:card-details",
  splGroupedMarket: "spl:grouped-market",
  splListingPrices: "spl:listing-prices",
  splMarketPrices: "spl:market-prices",
  splCollection: (username: string) => `spl:collection:${username.toLowerCase()}`,
  splBalances: (username: string) => `spl:balances:${username.toLowerCase()}`,
  splMarketplace: (username: string) => `spl:marketplace:${username.toLowerCase()}`,
  splPlayerSkins: (username: string) => `spl:player-skins:${username.toLowerCase()}`,
  splPlayerDetails: (username: string) => `spl:player-details:${username.toLowerCase()}`,
  splDraws: (username: string) => `spl:draws:${username.toLowerCase()}`,
  splSeasonRewards: (username: string) => `spl:season-rewards:${username.toLowerCase()}`,
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
    CACHE_TAGS.splBalances(normalized),
    CACHE_TAGS.splPlayerDetails(normalized),
    CACHE_TAGS.splDraws(normalized),
    CACHE_TAGS.splSeasonRewards(normalized),
    CACHE_TAGS.splPoolBalances(normalized),
    CACHE_TAGS.splDailyProgress(normalized),
    CACHE_TAGS.splBrawl(normalized),
    CACHE_TAGS.splCollection(normalized),
    CACHE_TAGS.splLandHarvest(normalized),
  ];
}

export type CacheInvalidationTarget =
  | { type: "collection"; usernames: string[] }
  | { type: "balances"; usernames: string[] }
  | { type: "marketplace"; usernames: string[] }
  | { type: "player-skins"; usernames: string[] }
  | { type: "card-details" }
  | { type: "settings" }
  | { type: "maintenance" }
  | { type: "grouped-market" }
  | { type: "portfolio"; usernames: string[] }
  | { type: "dashboard-account"; usernames: string[] };
