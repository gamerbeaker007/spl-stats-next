"use server";

import { fetchFrontierDrawsPrizeOverview } from "@/lib/backend/api/spl/spl-api";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";

export async function getFrontierDraws(): Promise<RankedDrawsPrizeCard[]> {
  return fetchFrontierDrawsPrizeOverview();
}
