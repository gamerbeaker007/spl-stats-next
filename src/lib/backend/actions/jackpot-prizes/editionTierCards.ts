"use server";

import { getCachedMintHistory } from "@/lib/backend/cache/jackpot-cache";
import { getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { CardPrizeData, FoilStats } from "@/types/jackpot-prizes/shared";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { cacheLife } from "next/cache";

const FOIL_TYPES = [2, 3, 4] as const;
/** Cards fetched concurrently (×3 foils), to avoid bursting SPL on a cache miss. */
const BATCH_SIZE = 5;

export interface EditionTierResult {
  prizeData: CardPrizeData[];
  cardDetails: SplCardDetail[];
}

export async function getEditionTierCards(
  edition: number,
  tier: number
): Promise<EditionTierResult> {
  "use cache";
  cacheLife("hours");

  const allCardDetails = await getCachedSplCardDetails();

  const targetCards = allCardDetails.filter(
    (c) =>
      c.editions
        .split(",")
        .map((e) => e.trim())
        .includes(String(edition)) && c.tier === tier
  );

  // Any failure throws, so this hours-long cache never stores zeros for failed calls.
  const prizeData: CardPrizeData[] = [];
  for (let i = 0; i < targetCards.length; i += BATCH_SIZE) {
    const batch = await Promise.all(
      targetCards.slice(i, i + BATCH_SIZE).map(async (card): Promise<CardPrizeData> => {
        const results = await Promise.all(
          FOIL_TYPES.map((foil) => getCachedMintHistory(foil, card.id))
        );
        const foils: FoilStats[] = FOIL_TYPES.map((foil, j) => ({
          foil,
          minted: results[j].total_minted,
          total: results[j].total,
        }));

        return {
          card_detail_id: card.id,
          total: foils.reduce((sum, f) => sum + f.total, 0),
          total_minted: foils.reduce((sum, f) => sum + f.minted, 0),
          foils,
        };
      })
    );
    prizeData.push(...batch);
  }

  return { prizeData, cardDetails: targetCards };
}
