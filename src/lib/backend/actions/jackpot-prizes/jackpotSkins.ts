"use server";

import { SplSkin } from "@/types/spl/jackpot";
import { fetchJackPotSkins } from "@/lib/backend/api/spl/spl-api";

export async function getJackpotSkins(): Promise<SplSkin[]> {
  return await fetchJackPotSkins();
}
