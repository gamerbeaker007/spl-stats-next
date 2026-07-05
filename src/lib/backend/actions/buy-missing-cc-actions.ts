"use server";

import {
  fetchCardCollection,
  fetchCardDetails,
  fetchMarketForSaleGrouped,
  fetchPlayerBalances,
  fetchSettings,
} from "@/lib/backend/api/spl/spl-api";
import { SOULKEEP_EDITIONS } from "@/lib/shared/edition-utils";
import type { BuyMissingCcSnapshot } from "@/types/buy-missing-cc";

export async function getBuyMissingCcSnapshotAction(
  account: string
): Promise<BuyMissingCcSnapshot> {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }

  const [cardDetails, collection, groupedMarket, settings, balances] = await Promise.all([
    fetchCardDetails(),
    fetchCardCollection(normalized),
    fetchMarketForSaleGrouped(),
    fetchSettings(),
    fetchPlayerBalances(normalized),
  ]);

  // SoulKeep cards cannot be bought through the Buy Missing CC feature,
  // so exclude them from the player's collection and the card details.
  const filteredCardDetails = cardDetails.filter((card) => {
    const editions = card.editions.split(",").map((e) => e.trim());
    return !editions.some((edition) => SOULKEEP_EDITIONS.has(Number(edition)));
  });

  collection.cards = collection.cards.filter(
    (card) => !SOULKEEP_EDITIONS.has(Number(card.edition))
  );

  return {
    account: normalized,
    cardDetails: filteredCardDetails,
    collection,
    groupedMarket,
    settings,
    balances,
  };
}
