"use server";

import { SplSkin } from "@/types/spl/jackpot";
import {
  getCachedFrontierJackpotSkins,
  getCachedJackpotSkins,
  getCachedMajorJackpotSkins,
  getCachedMinorJackpotSkins,
} from "@/lib/backend/cache/jackpot-cache";

export async function getJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedJackpotSkins();
}

export async function getMinorJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedMinorJackpotSkins();
}

export async function getMajorJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedMajorJackpotSkins();
}

export async function getFrontierJackpotSkins(): Promise<SplSkin[]> {
  return await getCachedFrontierJackpotSkins();
}
