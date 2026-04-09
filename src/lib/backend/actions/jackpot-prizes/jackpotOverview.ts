"use server";

import { fetchPackJackpotOverview } from "@/lib/backend/api/spl/spl-api";
import { PackJackpotCard } from "@/types/jackpot-prizes/packJackpot";

export async function getJackpotOverview(edition: number): Promise<PackJackpotCard[]> {
  return await fetchPackJackpotOverview(edition);
}
