"use server";

import { getCachedPackJackpotOverview } from "@/lib/backend/cache/jackpot-cache";
import { PackJackpotCard } from "@/types/jackpot-prizes/packJackpot";

export async function getJackpotOverview(edition: number): Promise<PackJackpotCard[]> {
  return await getCachedPackJackpotOverview(edition);
}
