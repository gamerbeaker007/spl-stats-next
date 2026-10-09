"use server";

import { SplSkin } from "@/types/spl/jackpot";
import {
  getCachedJackpotSkins,
  getCachedMinorJackpotSkins,
} from "@/lib/backend/cache/jackpot-cache";

export async function getJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedJackpotSkins();
}

export async function getMinorJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedMinorJackpotSkins();
}
