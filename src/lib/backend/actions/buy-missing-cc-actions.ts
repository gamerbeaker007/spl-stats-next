"use server";

import { getCachedSplCardDetails, getCachedSplSettings } from "@/lib/backend/cache/spl-cache";
import { SOULKEEP_EDITIONS } from "@/lib/shared/edition-utils";
import type { BuyMissingCcSnapshot } from "@/types/buy-missing-cc";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import { cacheLife } from "next/cache";

export async function getBuyMissingCcSharedDataAction() {
  "use cache";
  cacheLife("days");

  const [cardDetails, settings] = await Promise.all([
    getCachedSplCardDetails(),
    getCachedSplSettings(),
  ]);

  // SoulKeep cards cannot be bought through the Buy Missing CC feature.
  const filteredCardDetails = cardDetails.filter((card) => {
    const editions = card.editions.split(",").map((edition) => edition.trim());
    return !editions.some((edition) => SOULKEEP_EDITIONS.has(Number(edition)));
  });

  return {
    cardDetails: filteredCardDetails,
    settings,
  };
}

export async function getBuyCardDialogSharedContextAction(cardDetailId: number): Promise<{
  settings: BuyMissingCcSnapshot["settings"];
  cardDetail: SplCardDetail;
}> {
  const sharedData = await getBuyMissingCcSharedDataAction();
  const detail = sharedData.cardDetails.find((entry) => entry.id === cardDetailId);

  if (!detail) {
    throw new Error(`Card detail ${cardDetailId} not found`);
  }

  return {
    settings: sharedData.settings,
    cardDetail: detail,
  };
}
