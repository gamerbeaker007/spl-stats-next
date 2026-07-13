export const CACHE_TAGS = {
  splSettings: "spl:settings",
  splMaintenance: "spl:maintenance",
  splCardDetails: "spl:card-details",
  splGroupedMarket: "spl:grouped-market",
  splCollection: (username: string) => `spl:collection:${username.toLowerCase()}`,
  splBalances: (username: string) => `spl:balances:${username.toLowerCase()}`,
  splMarketplace: (username: string) => `spl:marketplace:${username.toLowerCase()}`,
} as const;

export type CacheInvalidationTarget =
  | { type: "collection"; usernames: string[] }
  | { type: "balances"; usernames: string[] }
  | { type: "marketplace"; usernames: string[] }
  | { type: "card-details" }
  | { type: "settings" }
  | { type: "maintenance" }
  | { type: "grouped-market" };
