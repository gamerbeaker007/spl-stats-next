"use server";

import { getCachedFrontierDrawsOverview } from "@/lib/backend/cache/jackpot-cache";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";
import type { CachedData } from "@/types/jackpot-prizes/freshness";

export async function getFrontierDraws(): Promise<CachedData<RankedDrawsPrizeCard[]>> {
  return getCachedFrontierDrawsOverview();
}
