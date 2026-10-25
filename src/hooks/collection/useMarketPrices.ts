"use client";

import { loadMarketPrices } from "@/lib/frontend/collection-data";
import { useLivePolling } from "@/hooks/collection/useLivePolling";
import type { MarketPriceInfo } from "@/types/spl/market";
import { useState } from "react";

/**
 * Grouped market prices (and when this tab fetched them from SPL, directly from
 * the browser) keyed by `${cardDetailId}-${edition}-${foilInt}`, re-fetched every
 * MARKET_PRICE_REFRESH_SECONDS while enabled.
 * Paused while the tab is hidden and
 * refreshed right away when it becomes visible again.
 */
export function useMarketPrices(enabled: boolean) {
  const [data, setData] = useState<
    { prices: Record<string, MarketPriceInfo>; fetchedAt: string } | undefined
  >(undefined);

  useLivePolling(async () => {
    try {
      setData(await loadMarketPrices());
    } catch {
      // Keep the last known prices; the next tick retries.
    }
  }, enabled);

  return { marketPrices: data?.prices, pricesFetchedAt: data?.fetchedAt };
}
