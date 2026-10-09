"use server";

import { getCachedRankedDrawsOverview } from "@/lib/backend/cache/jackpot-cache";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";

export async function getRankedDraws(): Promise<RankedDrawsPrizeCard[]> {
  return await getCachedRankedDrawsOverview();
}
