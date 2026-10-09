"use server";

import { getCachedCardHistory } from "@/lib/backend/cache/jackpot-cache";
import { CardHistoryResponse } from "@/types/jackpot-prizes/cardHistory";

export async function getCardHistory(uid: string): Promise<CardHistoryResponse> {
  return await getCachedCardHistory(uid);
}
