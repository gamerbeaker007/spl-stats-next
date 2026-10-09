"use server";

import { getCachedCaGoldRewards } from "@/lib/backend/cache/jackpot-cache";
import { SplCAGoldReward } from "@/types/jackpot-prizes/cardCollection";

export async function getJackpotGoldCards(): Promise<SplCAGoldReward[]> {
  return await getCachedCaGoldRewards();
}
