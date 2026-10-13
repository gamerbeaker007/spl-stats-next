"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { deleteCardWatch, listCardWatches, upsertCardWatch } from "@/lib/backend/db/card-watches";
import logger from "@/lib/backend/log/logger.server";
import { rethrowFrameworkErrors } from "@/lib/backend/next-errors";
import { cardFoilOptions } from "@/types/card";
import type { CardWatch } from "@/types/card-watch";

function isValidCard(cardDetailId: number, edition: number, foil: number): boolean {
  return (
    Number.isInteger(cardDetailId) &&
    cardDetailId > 0 &&
    Number.isInteger(edition) &&
    edition >= 0 &&
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

/** Upper bound for a USD price snapshot — far above any real card listing. */
const MAX_WATCH_PRICE_USD = 1_000_000_000;

function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_WATCH_PRICE_USD;
}

/**
 * The "price at watch" snapshot comes from the browser, which reads the grouped
 * market from SPL. It only ever writes the caller's own watch row and is only
 * shown back to that user, so a tampered value can't affect anyone else; it is
 * still range-checked.
 */
export async function watchCardAction(
  cardDetailId: number,
  edition: number,
  foil: number,
  lowPriceBcx: number,
  lowPrice: number
): Promise<void> {
  if (!isValidCard(cardDetailId, edition, foil)) throw new Error("Invalid card");
  if (!isValidPrice(lowPriceBcx) || !isValidPrice(lowPrice)) throw new Error("Invalid price");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    await upsertCardWatch(user.username, cardDetailId, edition, foil, lowPriceBcx, lowPrice);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`watchCardAction error: ${error}`);
    throw new Error("Failed to watch card");
  }
}

export async function unwatchCardAction(
  cardDetailId: number,
  edition: number,
  foil: number
): Promise<void> {
  if (!isValidCard(cardDetailId, edition, foil)) throw new Error("Invalid card");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    await deleteCardWatch(user.username, cardDetailId, edition, foil);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`unwatchCardAction error: ${error}`);
    throw new Error("Failed to unwatch card");
  }
}
