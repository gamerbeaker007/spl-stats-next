"use server";

import { getCachedPackJackpotOverview } from "@/lib/backend/cache/jackpot-cache";
import { PackJackpotCard } from "@/types/jackpot-prizes/packJackpot";
import type { CachedData } from "@/types/jackpot-prizes/freshness";

export async function getJackpotOverview(edition: number): Promise<CachedData<PackJackpotCard[]>> {
  return await getCachedPackJackpotOverview(edition);
}
