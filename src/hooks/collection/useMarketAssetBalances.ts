"use client";

import { fetchAccountBalances } from "@/lib/frontend/spl-browser-api";
import { tokenBalance } from "@/lib/shared/marketplace-purchase";
import { useAsyncData } from "@/hooks/useAsyncData";

export interface MarketBalances {
  dec: number;
  credits: number;
}

const NO_BALANCES: MarketBalances = { dec: 0, credits: 0 };

async function fetchMarketBalances(account: string): Promise<MarketBalances> {
  const balances = await fetchAccountBalances(account);
  return { dec: tokenBalance(balances, "DEC"), credits: tokenBalance(balances, "CREDITS") };
}

/**
 * Loads the account's DEC/CREDITS balances for marketplace flows. Exposes a
 * `refresh` so callers can re-pull after a purchase without a full remount.
 */
export function useMarketAssetBalances(account: string, enabled = true) {
  const { data, loading, error, refetch } = useAsyncData(
    enabled && account ? `market-balances:${account}` : null,
    () => fetchMarketBalances(account),
    { errorMessage: "Failed to load balances" }
  );
  return { balances: data ?? NO_BALANCES, loading, error, refresh: refetch };
}
