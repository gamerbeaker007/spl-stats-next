"use server";

import { PKBidsResponse, PKPricesResponse } from "@/types/jackpot-prizes/pkPrices";
import {
  getCachedPeakMonsterPrices,
  getCachedPeakMonsterTopBids,
} from "@/lib/backend/cache/jackpot-cache";

export async function getPeakMonsterPricesAction(): Promise<PKPricesResponse> {
  return await getCachedPeakMonsterPrices();
}

export async function getPeakMonsterTopBidsAction(): Promise<PKBidsResponse> {
  return await getCachedPeakMonsterTopBids();
}
