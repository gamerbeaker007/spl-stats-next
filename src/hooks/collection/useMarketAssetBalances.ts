"use client";

import { getPlayerMarketBalancesAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { useCallback, useEffect, useState } from "react";

export interface MarketBalances {
  dec: number;
  credits: number;
}

/**
 * Loads the account's DEC/CREDITS balances for marketplace flows. Exposes a
 * `refresh` so callers can re-pull after a purchase without a full remount.
 */
export function useMarketAssetBalances(account: string, enabled = true) {
  const [balances, setBalances] = useState<MarketBalances>({ dec: 0, credits: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getPlayerMarketBalancesAction(account);
      setBalances(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (!enabled || !account) {
      setBalances({ dec: 0, credits: 0 });
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getPlayerMarketBalancesAction(account)
      .then((next) => {
        if (active) setBalances(next);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load balances");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [account, enabled]);

  return { balances, loading, error, refresh, setBalances };
}
