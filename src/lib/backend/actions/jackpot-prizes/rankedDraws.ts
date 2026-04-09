"use server";

import { fetchRankedDrawsPrizeOverview } from "@/lib/backend/api/spl/spl-api";
import { RankedDrawsPrizeCard } from "@/types/jackpot-prizes/rankedDraws";

export async function getRankedDraws(): Promise<RankedDrawsPrizeCard[]> {
  return await fetchRankedDrawsPrizeOverview();
}
