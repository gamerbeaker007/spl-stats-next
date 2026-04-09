"use server";

import { fetchJackPotGold } from "@/lib/backend/api/spl/spl-api";
import { SplCAGoldReward } from "@/types/jackpot-prizes/cardCollection";

export async function getJackpotGoldCards(): Promise<SplCAGoldReward[]> {
  return await fetchJackPotGold();
}
