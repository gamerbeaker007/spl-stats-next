"use server";

import { getCachedRankedDrawsOverview } from "@/lib/backend/cache/jackpot-cache";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";
import type { CachedData } from "@/types/jackpot-prizes/freshness";

export async function getRankedDraws(): Promise<CachedData<RankedDrawsPrizeCard[]>> {
  return await getCachedRankedDrawsOverview();
}
