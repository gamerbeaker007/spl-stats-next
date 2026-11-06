"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getDecPriceUsdAction } from "@/lib/backend/actions/marketplace-assets-actions";
import {
  fetchLandResourcePools,
  fetchMarketplaceLanding,
  fetchPlayerLandDeeds,
} from "@/lib/frontend/spl-browser-api";
import { calculateLandNetDec, valueAuraViaMidnightPotion } from "@/lib/shared/land-net-dec";
import type { LandAuraValuation, LandNetDecSummary } from "@/types/land/landNetDec";

const MIDNIGHT_POTION_DETAIL_ID = "MIDNIGHTPOT";

/** AURA price via the cheapest Midnight Potion listing; `null` (AURA unpriced) on any failure. */
async function loadAuraValuation(): Promise<LandAuraValuation | null> {
  try {
    const [consumables, decUsd] = await Promise.all([
      fetchMarketplaceLanding(null, "CONSUMABLES"),
      getDecPriceUsdAction(),
    ]);
    const potion = consumables.find((asset) => asset.detailId === MIDNIGHT_POTION_DETAIL_ID);
    const potionUsd = potion?.prices.find((p) => p.currency === "USD")?.minPrice ?? 0;
    return valueAuraViaMidnightPotion(potionUsd, decUsd);
  } catch {
    return null;
  }
}

/** Net DEC per hour of the account's land worksites (browser, live). */
export function useLandNetDec(username: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { data, loading, error, refetch } = useAsyncData<LandNetDecSummary>(
    enabled && username ? `land-net-dec:${username.toLowerCase()}` : null,
    async () => {
      const [deeds, pools, aura] = await Promise.all([
        fetchPlayerLandDeeds(username),
        fetchLandResourcePools(),
        loadAuraValuation(),
      ]);
      return calculateLandNetDec(deeds, pools, aura);
    },
    { errorMessage: "Failed to load land production" }
  );
  return { data: data ?? null, loading, error, refetch };
}
