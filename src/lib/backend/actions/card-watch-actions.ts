"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { getCollectionMarketPricesAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import { deleteCardWatch, listCardWatches, upsertCardWatch } from "@/lib/backend/db/card-watches";
import logger from "@/lib/backend/log/logger.server";
import { rethrowFrameworkErrors } from "@/lib/backend/next-errors";
import { cardFoilOptions } from "@/types/card";
import type { CardWatch } from "@/types/card-watch";

function isValidCard(cardDetailId: number, foil: number): boolean {
  return (
    Number.isInteger(cardDetailId) &&
    cardDetailId > 0 &&
    Number.isInteger(foil) &&
    foil >= 0 &&
    foil < cardFoilOptions.length
  );
}

export async function getCardWatchesAction(): Promise<CardWatch[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    return await listCardWatches(user.username);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`getCardWatchesAction error: ${error}`);
    return [];
  }
}

/** Snapshot prices are read server-side from the same grouped market data the page shows. */
export async function watchCardAction(cardDetailId: number, foil: number): Promise<void> {
  if (!isValidCard(cardDetailId, foil)) throw new Error("Invalid card");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    const { prices } = await getCollectionMarketPricesAction();
    const price = prices[`${cardDetailId}-${foil}`];
    await upsertCardWatch(
      user.username,
      cardDetailId,
      foil,
      price?.lowPriceBcx ?? 0,
      price?.lowPrice ?? 0
    );
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`watchCardAction error: ${error}`);
    throw new Error("Failed to watch card");
  }
}

export async function unwatchCardAction(cardDetailId: number, foil: number): Promise<void> {
  if (!isValidCard(cardDetailId, foil)) throw new Error("Invalid card");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    await deleteCardWatch(user.username, cardDetailId, foil);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`unwatchCardAction error: ${error}`);
    throw new Error("Failed to unwatch card");
  }
}
