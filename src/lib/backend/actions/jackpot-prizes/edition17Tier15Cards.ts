"use server";

import { fetchCardDetails, fetchMintHistory } from "@/lib/backend/api/spl/spl-api";
import { CardPrizeData, FoilStats, SplCardDetail } from "@/types/jackpot-prizes/shared";
import { cacheLife } from "next/cache";

const FOIL_TYPES = [3, 2, 4] as const;

export interface Edition17Tier15Result {
  prizeData: CardPrizeData[];
  cardDetails: SplCardDetail[];
}

export async function getEdition17Tier15Cards(): Promise<Edition17Tier15Result> {
  "use cache";
  cacheLife("hours");

  const allCardDetails = await fetchCardDetails();

  const targetCards = allCardDetails.filter(
    (c) =>
      c.editions
        .split(",")
        .map((e) => e.trim())
        .includes("17") && c.tier === 15
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
