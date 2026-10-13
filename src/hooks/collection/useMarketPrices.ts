"use client";

import { loadMarketPrices } from "@/lib/frontend/collection-data";
import { MARKET_PRICE_REFRESH_SECONDS } from "@/lib/shared/market-refresh";
import type { MarketPriceInfo } from "@/types/spl/market";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = () => {
      if (document.hidden) return;
      loadMarketPrices()
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          // Keep the last known prices; the next tick retries.
        });
    };

    load();
    const interval = setInterval(load, MARKET_PRICE_REFRESH_SECONDS * 1000);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled]);

  return { marketPrices: data?.prices, pricesFetchedAt: data?.fetchedAt };
}
