"use server";

import { getCachedSplPrices } from "@/lib/backend/cache/spl-cache";

/**
 * USD-per-DEC rate (shared ~1 min price cache). Used for DEC previews and by the
 * browser payload builders; the broadcast's `dec_mismatch_percent` (1.5%)
 * absorbs the cache age.
 */
export async function getDecPriceUsdAction(): Promise<number> {
  const prices = await getCachedSplPrices();
  return prices.dec;
}
