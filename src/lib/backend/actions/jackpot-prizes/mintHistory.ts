"use server";

import { getCachedMintHistory, getCachedRecentPrizes } from "@/lib/backend/cache/jackpot-cache";
import { MintHistoryResponse, RecentWinner } from "@/types/jackpot-prizes/shared";

export async function getMintHistoryAction(
  foil: number,
  cardId: number
): Promise<MintHistoryResponse> {
  return await getCachedMintHistory(foil, cardId);
}

export async function getRecentWinnersAction(edition: number = 14): Promise<RecentWinner[]> {
  const foilTypes = [2, 3, 4];

  // Cached per foil, so a failed foil is retried next time instead of cached as empty.
  const results = await Promise.allSettled(
    foilTypes.map((foil) => getCachedRecentPrizes(edition, foil))
  );

  const combined: RecentWinner[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const foil = foilTypes[index];
      result.value.forEach((item) => {
        combined.push({ ...item, foil });
      });
    }
  });

  combined.sort(
    (a, b) => new Date(b.mint_date ?? 0).getTime() - new Date(a.mint_date ?? 0).getTime()
  );

  // Filter to last 8 days
  const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
  return combined.filter((item) => item.mint_date && new Date(item.mint_date).getTime() >= cutoff);
}
