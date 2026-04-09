/**
 * Central place for all card image URL construction.
 *
 * Do not add new card-image URL builders elsewhere.
 *
 * Remaining duplicates (not yet migrated):
 *   - getCardImg()  in @/lib/collectionUtils.ts         — battle/stats (cards_by_level .png)
 *   - Card.tsx      in multi-dashboard/reward-history/  — local inline, custom edition-folder map
 *   - cardImageMd() in hive-blog-actions.ts             — markdown image string
 */

import type { CardFoil } from "@/types/card";
import { WEB_URL } from "@/lib/staticsIconUrls";
import { getEditionUrlName } from "@/lib/shared/edition-utils";

// ---------------------------------------------------------------------------
// Foil suffix maps
// ---------------------------------------------------------------------------

/** Foil suffix for cards_by_level (PNG) and cards_v2.2 (JPG) formats. */
export const CARD_FOIL_SUFFIX: Record<CardFoil, string> = {
  regular: "",
  gold: "_gold",
  "gold arcane": "_gold",
  black: "_blk",
  "black arcane": "_blk",
};

/** Foil suffix keyed by legacy numeric foil value (0-4). */
const CARD_FOIL_SUFFIX_NUMERIC: Record<number, string> = {
  0: "",
  1: "_gold",
  2: "_gold",
  3: "_blk",
  4: "_blk",
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Human-readable label for a CardFoil string. */
export const FOIL_LABEL: Record<CardFoil, string> = {
  regular: "Regular",
  gold: "Gold",
  "gold arcane": "Gold Arcane",
  black: "Black",
  "black arcane": "Black Arcane",
};

/** Short badge label used in tight UI spaces. */
export const FOIL_SHORT_LABEL: Record<CardFoil, string> = {
  regular: "",
  gold: "GF",
  "gold arcane": "GFA",
  black: "BF",
  "black arcane": "BFA",
};

// ---------------------------------------------------------------------------
// cards_by_level format — PNG, includes edition folder and level
// Used for: market bought/sold display, battle stats, reward history cards
// ---------------------------------------------------------------------------

/**
 * Returns the CDN URL for a card image using the cards_by_level format.
 *
 * @param name    - Card name (e.g. "Chaos Knight")
 * @param edition - Edition numeric ID (e.g. 7 for Chaos Legion)
 * @param foil    - CardFoil string ("regular" | "gold" | "gold arcane" | "black" | "black arcane")
 * @param level   - Card level (defaults to 1)
 */
export function getCardImageByLevel(
  name: string,
  edition: number,
  foil: CardFoil,
  level = 1
): string {
  const safeName = encodeURIComponent(name.trim());
  const editionName = getEditionUrlName(edition) ?? "reward";
  const suffix = CARD_FOIL_SUFFIX[foil] ?? "";
  return `${WEB_URL}cards_by_level/${editionName}/${safeName}_lv${level}${suffix}.png`;
}

// ---------------------------------------------------------------------------
// cards_v2.2 format — JPG, no level
// Used for: jackpot prizes, reward chest display
// ---------------------------------------------------------------------------

/**
 * Returns the CDN URL for a card image using the cards_v2.2 format.
 * Accepts the legacy numeric foil value for backward compatibility.
 *
 * @param name       - Card name
 * @param foil       - Numeric foil (0=regular, 1-2=gold, 3-4=black)
 * @param isLandCard - Use the cards_land folder instead of cards_v2.2
 */
export function getCardImageV2(name: string, foil = 0, isLandCard?: boolean): string {
  if (!name?.trim()) return `${WEB_URL}cards_v2.2/placeholder.jpg`;
  const safeName = encodeURIComponent(name.trim());
  const suffix = CARD_FOIL_SUFFIX_NUMERIC[foil] ?? "";
  const folder = isLandCard ? "cards_land" : "cards_v2.2";
  return `${WEB_URL}${folder}/${safeName}${suffix}.jpg`;
}

/** Alias for getCardImageV2 — preferred name for jackpot/chest reward consumers. */
export const getCardImageUrl = getCardImageV2;

/** Fallback card image URL (regular foil, cards_v2.2 format). */
export function getFallbackImageUrl(cardName: string): string {
  if (!cardName?.trim()) return `${WEB_URL}cards_v2.2/placeholder.jpg`;
  return getCardImageV2(cardName, 0);
}

// ---------------------------------------------------------------------------
// Foil label — numeric foil (legacy API values)
// ---------------------------------------------------------------------------

/** Human-readable label for a numeric foil value (0=regular, 1-2=gold, 3-4=black). */
export function getFoilLabel(foil: number): string {
  const FOIL_LABELS: Record<number, string> = {
    0: "Regular",
    1: "Gold Foil",
    2: "Gold Foil Arcane",
    3: "Black Foil",
    4: "Black Foil Arcane",
  };
  return FOIL_LABELS[foil] ?? `Foil ${foil}`;
}

// ---------------------------------------------------------------------------
// Skin images
// ---------------------------------------------------------------------------

/** CDN URL for a card skin image. Falls back to cards_v2.2/{skin}/{name}.jpg for unknown cards. */
export function getSkinImageUrl(cardName: string, skin: string): string {
  if (!cardName?.trim()) return `${WEB_URL}cards_v2.2/placeholder.jpg`;
  const cleanCardName = cardName.trim();
  const encodedName = encodeURIComponent(cleanCardName);

  if (cleanCardName === "Venari Marksrat") {
    return `${WEB_URL}cards_soulbound/${skin}/${encodedName}.jpg`;
  }
  if (cleanCardName === "Kelya Frendul" || cleanCardName === "Uraeus") {
    return `${WEB_URL}cards_chaos/${skin}/${encodedName}.jpg`;
  }
  if (
    cleanCardName === "Akane" ||
    cleanCardName === "Eternal Tofu" ||
    cleanCardName === "Gobalano Soldier" ||
    cleanCardName === "Daigendark Surveyor" ||
    cleanCardName === "Nimbledook Ranger" ||
    cleanCardName === "Nimbledook Scout"
  ) {
    return `${WEB_URL}cards_rebellion/${skin}/${encodedName}.jpg`;
  }
  if (cleanCardName === "Dark Arborist") {
    return `${WEB_URL}cards_soulboundrb/${skin}/${encodedName}.jpg`;
  }
  return `${WEB_URL}cards_v2.2/${skin}/${encodedName}.jpg`;
}
