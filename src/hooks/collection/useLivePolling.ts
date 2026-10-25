"use client";

import { MARKET_PRICE_REFRESH_SECONDS } from "@/lib/shared/market-refresh";
import { useEffect, useRef } from "react";

/**
 * Calls `tick` immediately (when `runImmediately`) and then every
 * MARKET_PRICE_REFRESH_SECONDS while `enabled`. Paused while the tab is hidden and
 * run again as soon as it becomes visible. The one polling loop behind every live
 * market view (card prices, marketplace assets, land market).
 */
export function useLivePolling(
  tick: () => void | Promise<unknown>,
  enabled: boolean,
  { runImmediately = true }: { runImmediately?: boolean } = {}
) {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (!document.hidden) void tickRef.current();
    };

    if (runImmediately) run();
    const interval = setInterval(run, MARKET_PRICE_REFRESH_SECONDS * 1000);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", run);
    };
  }, [enabled, runImmediately]);
}
