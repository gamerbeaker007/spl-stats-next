"use server";

import { SplSkin } from "@/types/spl/jackpot";
import { fetchJackPotSkins, fetchMinorJackpotSkins } from "@/lib/backend/api/spl/spl-api";

export async function getJackpotSkins(): Promise<SplSkin[]> {
  return await fetchJackPotSkins();
}

export async function getMinorJackpotSkins(): Promise<SplSkin[]> {
  return await fetchMinorJackpotSkins();
}
