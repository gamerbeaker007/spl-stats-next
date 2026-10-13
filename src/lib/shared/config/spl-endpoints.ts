/**
 * Every external Splinterlands API path the app calls, grouped by host. Paths are
 * relative to the host's base URL (`splApiConfig` for api/vapi) and carry no
 * query string — callers pass parameters themselves.
 *
 * Host-independent of the caller: the same constant is used by server axios
 * clients, the worker and the browser accessors (`lib/frontend/spl-browser-api.ts`).
 * Which side calls a given endpoint is decided per data type in CLAUDE.md, not here.
 * Search for a constant to find every caller of that endpoint.
 *
 * The app has no internal HTTP API routes — client → server calls are Server
 * Actions — so only external endpoints live here.
 */

/** `splApiConfig.publicBaseUrl` (api.splinterlands.com). */
export const SPL_API = {
  // Auth
  LOGIN: "/players/v2/login",

  // Global / shared data
  SETTINGS: "/settings",
  SEASON: "/season",
  METRICS: "/transactions/metrics",
  CARD_DETAILS: "/cards/get_details",
  MARKET_FOR_SALE_GROUPED: "/market/for_sale_grouped",
  MARKET_QUERY_BY_CARD: "/market/market_query_by_card",
  TRANSACTION_LOOKUP: "/transactions/lookup",
  TOURNAMENT_FIND: "/tournaments/find",
  BATTLE_RESULT: "/battle/result",

  // Per player
  PLAYER_DETAILS: "/players/details",
  PLAYER_BALANCES: "/players/balances",
  PLAYER_INVENTORY: "/players/inventory",
  PLAYER_SKINS: "/players/skins",
  PLAYER_CURRENT_REWARDS: "/players/current_rewards",
  PLAYER_LEADERBOARD_WITH_PLAYER: "/players/leaderboard_with_player",
  CARDS_COLLECTION: (username: string) => `/cards/collection/${encodeURIComponent(username)}`,

  // Cards / jackpot
  CARD_HISTORY: "/cards/history",
  MINT_HISTORY: "/cards/mint_history",
  PACK_JACKPOT_OVERVIEW: "/cards/pack_jackpot_overview",
  CA_GOLD_REWARDS: "/cards/ca_gold_rewards",

  // Ranked / frontier draws
  RANKED_DRAWS_STATUS: "/ranked_draws/status",
  RANKED_DRAWS_PRIZE_OVERVIEW: "/ranked_draws/prize_overview",
  RANKED_DRAWS_RECENT_PRIZES: "/ranked_draws/recent_prizes",
  RANKED_DRAWS_COMPLETE: "/ranked_draws/complete",
  RANKED_DRAWS_ENTRIES_COMPLETED: "/ranked_draws/entries_completed",
  RANKED_DRAWS_AVAILABLE_PRIZES: "/ranked_draws/available_prizes",
  FRONTIER_DRAWS_STATUS: "/frontier_draws/status",
  FRONTIER_DRAWS_PRIZE_OVERVIEW: "/frontier_draws/prize_overview",
  FRONTIER_DRAWS_RECENT_PRIZES: "/frontier_draws/recent_prizes",
  FRONTIER_DRAWS_COMPLETE: "/frontier_draws/complete",
  FRONTIER_DRAWS_ENTRIES_COMPLETED: "/frontier_draws/entries_completed",
  FRONTIER_DRAWS_AVAILABLE_PRIZES: "/frontier_draws/available_prizes",

  // JWT-authenticated (server only — never call from the browser)
  PLAYER_HISTORY: "/players/history",
  PLAYER_BALANCE_HISTORY: "/players/balance_history",
  PLAYER_UNCLAIMED_BALANCE_HISTORY: "/players/unclaimed_balance_history",
  BATTLE_HISTORY: "/battle/history2",
  DAILIES_PROGRESS: "/dailies/progress",
  TOURNAMENT_FIND_BRAWL: "/tournaments/find_brawl",
} as const;

/** `splApiConfig.vapiBaseUrl` (vapi.splinterlands.com). */
export const SPL_VAPI = {
  LAND_DEEDS: "/land/deeds",
  LAND_DEEDS_OWNED: (player: string) => `/land/deeds/owned/${encodeURIComponent(player)}`,
  LAND_STAKE_DEC_STAKED: "/land/stake/decstaked",
  LAND_LIQUIDITY_POOLS: "/land/liquidity/pools",
  LAND_LIQUIDITY_POOL: (poolId: number) => `/land/liquidity/pools/${poolId}`,
  LAND_LIQUIDITY_PLAYER_POOL: (player: string, symbol: string) =>
    `/land/liquidity/pools/${encodeURIComponent(player)}/${encodeURIComponent(symbol)}`,
  LAND_RESOURCES_OWNED: "/land/resources/owned",
  MARKET_LANDING: "/market/landing",
  MARKET_META_ASSET: (assetName: string) => `/market/meta/asset/${encodeURIComponent(assetName)}`,
  MARKET_LISTING_ITEMS: "/market/listing-items",
  MARKET_DEBUG_LISTING_ITEM: "/market/debug/listing-item",
  MARKET_PLAYER_ALL_LISTINGS: "/market/player/all_listings",

  // JWT-authenticated (server only — never call from the browser)
  LAND_RESOURCES_PRODUCTION_OVERVIEW: "/land/resources/production/overview",
} as const;

/** Token USD prices host. */
export const SPL_PRICES_BASE_URL = "https://prices.splinterlands.com";
export const SPL_PRICES_API = {
  PRICES: "/prices",
} as const;
