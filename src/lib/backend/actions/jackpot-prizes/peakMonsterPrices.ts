"use server";

import { PKBidsResponse, PKPricesResponse } from "@/types/jackpot-prizes/pkPrices";
import {
  fetchPeakMonsterPrices,
  fetchPeakMonsterTopBids,
} from "../../api/peakmonsters/peakmonsters-api";

export async function getPeakMonsterPricesAction(): Promise<PKPricesResponse> {
  return await fetchPeakMonsterPrices();
}

export async function getPeakMonsterTopBidsAction(): Promise<PKBidsResponse> {
  return await fetchPeakMonsterTopBids();
}
