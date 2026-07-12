"use server";

import {
  getCachedSplCardCollection,
  getCachedSplCardDetails,
  getCachedSplGroupedMarket,
  getCachedSplPlayerBalances,
  getCachedSplSettings,
} from "@/lib/backend/cache/spl-cache";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import type { CombineCardState } from "@/lib/shared/buy-missing-cc";
import { toCardFoilInt } from "@/lib/shared/card-utils";
import { SOULKEEP_EDITIONS } from "@/lib/shared/edition-utils";
import type { BuyMissingCcAccountData, BuyMissingCcSnapshot } from "@/types/buy-missing-cc";
import { CardFoil } from "@/types/card";
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

export async function getBuyMissingCcAccountDataAction(
  account: string
): Promise<BuyMissingCcAccountData> {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }

  const [collection, groupedMarket, balances] = await Promise.all([
    getCachedSplCardCollection(normalized),
    getCachedSplGroupedMarket(),
    getCachedSplPlayerBalances(normalized),
  ]);

  collection.cards = collection.cards.filter(
    (card) => !SOULKEEP_EDITIONS.has(Number(card.edition))
  );

  return {
    account: normalized,
    collection,
    groupedMarket,
    balances,
  };
}

function normalizeAccount(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }
  return normalized;
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

export async function getBuyCardDialogAccountContextAction(
  account: string,
  cardDetailId: number,
  edition: number,
  foil: CardFoil
): Promise<{
  account: string;
  accountState: { highestLevel: number; highestCc: number; totalCc: number };
  balance: { DEC: number; CREDITS: number };
  cardUids: string[];
  combineCards: CombineCardState[];
}> {
  const normalized = normalizeAccount(account);
  const [collection, balances] = await Promise.all([
    getCachedSplCardCollection(normalized),
    getCachedSplPlayerBalances(normalized),
  ]);

  const cards = collection.cards.filter(
    (card) =>
      card.card_detail_id === cardDetailId &&
      Number(card.edition) === edition &&
      Number(card.foil) === toCardFoilInt(foil)
  );

  const accountState = cards.reduce(
    (acc, card) => {
      const level = card.level ?? 0;
      const bcx = card.bcx ?? 0;
      acc.totalCc += bcx;

      if (level > acc.highestLevel) {
        acc.highestLevel = level;
        acc.highestCc = bcx;
      } else if (level === acc.highestLevel) {
        acc.highestCc = Math.max(acc.highestCc, bcx);
      }

      return acc;
    },
    { highestLevel: 0, highestCc: 0, totalCc: 0 }
  );

  const combineCards: CombineCardState[] = cards.map((card) => ({
    uid: card.uid,
    level: card.level,
    bcx: card.bcx,
    onWagon: card.wagon_uid !== null,
    inSet: card.set_id !== null,
    delegatedTo: card.delegated_to,
  }));

  return {
    account: normalized,
    accountState,
    cardUids: combineCards.map((card) => card.uid).filter(Boolean),
    combineCards,
    balance: {
      DEC: balances.find((entry) => entry.token === "DEC")?.balance ?? 0,
      CREDITS: balances.find((entry) => entry.token === "CREDITS")?.balance ?? 0,
    },
  };
}

export async function getBuyMissingCcSnapshotAction(
  account: string
): Promise<BuyMissingCcSnapshot> {
  const [sharedData, accountData] = await Promise.all([
    getBuyMissingCcSharedDataAction(),
    getBuyMissingCcAccountDataAction(account),
  ]);

  return {
    account: accountData.account,
    cardDetails: sharedData.cardDetails,
    collection: accountData.collection,
    groupedMarket: accountData.groupedMarket,
    settings: sharedData.settings,
    balances: accountData.balances,
  };
}

export async function getBuyMissingCcDetailedCollectionAction(account: string) {
  const normalized = normalizeAccount(account);
  const [detailedCollection, groupedMarket, balances] = await Promise.all([
    getDetailedPlayerCardCollectionCached(normalized),
    getCachedSplGroupedMarket(),
    getCachedSplPlayerBalances(normalized),
  ]);

  return {
    account: normalized,
    detailedCollection,
    groupedMarket,
    balances,
  };
}
