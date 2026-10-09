/**
 * How often grouped market prices refresh, in seconds. Drives both the server
 * cache lifetime (`getCachedSplGroupedMarket`) and the client poll interval
 * (`useMarketPrices`), so the two stay in sync.
 */
export const MARKET_PRICE_REFRESH_SECONDS = 60;
