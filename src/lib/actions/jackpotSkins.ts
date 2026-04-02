"use server";

import { fetchJackPotSkins } from "@/lib/backend/api/spl/spl-api";
import { SplSkin } from "@/types/spl/jackpot";

export async function getJackpotSkins(): Promise<SplSkin[]> {
  return await fetchJackPotSkins();
}
