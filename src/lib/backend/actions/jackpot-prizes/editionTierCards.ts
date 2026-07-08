"use server";

import { fetchMintHistory } from "@/lib/backend/api/spl/spl-api";
import { getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { CardPrizeData, FoilStats } from "@/types/jackpot-prizes/shared";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { cacheLife } from "next/cache";

const FOIL_TYPES = [2, 3, 4] as const;

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

  const prizeData = await Promise.all(
    targetCards.map(async (card): Promise<CardPrizeData> => {
      const foilResults = await Promise.allSettled(
        FOIL_TYPES.map((foil) => fetchMintHistory(foil, card.id))
      );

      const foils: FoilStats[] = FOIL_TYPES.map((foil, i) => {
        const result = foilResults[i];
        if (result.status === "fulfilled") {
          return { foil, minted: result.value.total_minted, total: result.value.total };
        }
        return { foil, minted: 0, total: 0 };
      });

      return {
        card_detail_id: card.id,
        total: foils.reduce((sum, f) => sum + f.total, 0),
        total_minted: foils.reduce((sum, f) => sum + f.minted, 0),
        foils,
      };
    })
  );

  return { prizeData, cardDetails: targetCards };
}
