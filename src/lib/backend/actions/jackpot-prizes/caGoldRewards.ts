"use server";

import { getCachedCaGoldRewards } from "@/lib/backend/cache/jackpot-cache";
import { SplCAGoldReward } from "@/types/jackpot-prizes/cardCollection";
import type { CachedData } from "@/types/jackpot-prizes/freshness";

export async function getJackpotGoldCards(): Promise<CachedData<SplCAGoldReward[]>> {
  return await getCachedCaGoldRewards();
}
