"use server";

import {
  fetchCardCollection,
  fetchCardDetails,
  fetchMarketForSaleGrouped,
  fetchPlayerBalances,
  fetchSettings,
} from "@/lib/backend/api/spl/spl-api";
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

  return {
    account: normalized,
    cardDetails,
    collection,
    groupedMarket,
    settings,
    balances,
  };
}
