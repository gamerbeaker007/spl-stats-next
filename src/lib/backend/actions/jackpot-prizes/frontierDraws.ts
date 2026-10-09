"use server";

import { getCachedFrontierDrawsOverview } from "@/lib/backend/cache/jackpot-cache";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";

export async function getFrontierDraws(): Promise<RankedDrawsPrizeCard[]> {
  return getCachedFrontierDrawsOverview();
}
