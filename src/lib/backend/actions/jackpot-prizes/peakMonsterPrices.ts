"use server";

import { PKBidsResponse, PKPricesResponse } from "@/types/jackpot-prizes/pkPrices";
import {
  getCachedPeakMonsterPrices,
  getCachedPeakMonsterTopBids,
} from "@/lib/backend/cache/jackpot-cache";
import type { CachedData } from "@/types/jackpot-prizes/freshness";

export async function getPeakMonsterPricesAction(): Promise<CachedData<PKPricesResponse>> {
  return await getCachedPeakMonsterPrices();
}

export async function getPeakMonsterTopBidsAction(): Promise<CachedData<PKBidsResponse>> {
  return await getCachedPeakMonsterTopBids();
}
