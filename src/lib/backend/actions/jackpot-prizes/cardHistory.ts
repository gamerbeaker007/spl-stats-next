"use server";

import { fetchCardHistory } from "@/lib/backend/api/spl/spl-api";
import { CardHistoryResponse } from "@/types/jackpot-prizes/cardHistory";

export async function getCardHistory(uid: string): Promise<CardHistoryResponse> {
  return await fetchCardHistory(uid);
}
