"use server";

import { fetchCardDetails, fetchSettings } from "@/lib/backend/api/spl/spl-api";
import { getEditionId, getEditionLabel, getTier, isSoulbound } from "@/lib/shared/edition-utils";
import { getRarityById } from "@/lib/shared/rarity-utils";
import { CardFoil, cardFoilOptions, CardRarity, type CardOption } from "@/types/card";
import type { CardDistributionRow } from "@/types/card-stats";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";
import { cacheLife } from "next/cache";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RARITY_NAMES: Record<number, string> = {
  1: "Common",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};

const FOIL_LABELS: Record<number, string> = {
  0: "Regular",
  1: "Gold Foil",
  2: "Gold Foil Arcane",
  3: "Black Foil",
  4: "Black Foil Arcane",
};

function getFoilCategory(foil: number): CardFoil {
  if (foil === 0) return "regular";
  if (foil === 1) return "gold";
  if (foil === 2) return "gold arcane";
  if (foil === 3) return "black";
  return "black arcane"; // foil === 4
}

// ---------------------------------------------------------------------------
// BCX calculation — ported from spl-streamlit/src/util/card_util.py
// ---------------------------------------------------------------------------

/**
 * Convert a raw XP value to BCX (base card experience units).
 * Logic differs per edition/era — Alpha/Beta use XP tables from /settings;
 * Untamed and newer use a direct 1:1 mapping.
 */
function determineBcx(
  edition: number,
  tier: number | null,
  rarity: number,
  isGold: boolean,
  xp: number,
  settings: SplSettings
): number {
  if (xp === 0) return 0;

  // Untamed (4) and any card from Untamed era onward (tier ≥ 4): BCX = XP directly.
  const untamedTierNumber = getTier("untamed")!;
  //from tier 4 and up (untamed era xp = bcx)
  if (tier !== null && tier >= untamedTierNumber) {
    return xp;
  }

  // Determine which XP threshold to use.
  const isAlpha = edition === getEditionId("alpha");
  const isAlphaTier = tier === getTier("alpha")!;
  const isPromo = edition === getEditionId("promo");
  let xpThresholds: number[];
  if (isAlpha || (isPromo && isAlphaTier)) {
    // Alpha cards or Alpha-era promos.
    xpThresholds = isGold ? (settings.gold_xp ?? []) : (settings.alpha_xp ?? []);
  } else {
    // Beta (or Beta-era promos / rewards).
    xpThresholds = isGold ? (settings.beta_gold_xp ?? []) : (settings.beta_xp ?? []);
  }

  const bcxXp = xpThresholds[rarity - 1] ?? 1;
  let bcx = isGold ? Math.max(xp / bcxXp, 1) : (xp + bcxXp) / bcxXp;

  // Alpha cards: subtract 1 from the result.
  if (edition === 0) bcx -= 1;

  return Math.floor(bcx);
}

// ---------------------------------------------------------------------------
// CP calculation — ported from spl-streamlit/src/util/data_util.py
// ---------------------------------------------------------------------------

/** The three distinct CP tiers — arcane variants map to their base foil. */
type CpFoilKey = "regular" | "gold" | "black";

const FOIL_TO_CP_KEY: Record<CardFoil, CpFoilKey> = {
  regular: "regular",
  gold: "gold",
  "gold arcane": "gold",
  black: "black",
  "black arcane": "black",
};

/** CP base value per BCX, indexed by card rarity and CP foil tier. */
const CP_PER_BCX: Record<CardRarity, Record<CpFoilKey, number>> = {
  common: { regular: 5, gold: 125, black: 625 },
  rare: { regular: 20, gold: 500, black: 2500 },
  epic: { regular: 100, gold: 2500, black: 12500 },
  legendary: { regular: 500, gold: 12500, black: 62500 },
};

const CP_MULTIPLIERS = {
  gladius: { regular: 2, gold: 4 },
  untamed: { regular: 2, gold: 4 },
  untamed_promo: { regular: 6, gold: 12 },
  alpha: { regular: 6, gold: 12 },
  beta: { regular: 3, gold: 6 },
  beta_promo: { regular: 6, gold: 12 },
} as const;

function getCpMultiplier(edition: number, tier: number | null, foil: number): number {
  // From chaos legion its default 1
  const untamedTier = getTier("untamed")!;
  const chaosEdition = getEditionId("chaos legion")!;
  if (edition >= chaosEdition || (tier !== null && tier > untamedTier)) return 1;

  // Note: special foils will not come here because they are introduced after chaos legion
  const isGold = foil > 0;
  const key = isGold ? "gold" : "regular";

  // Gladius
  const isGladius = edition === getEditionId("gladius");
  if (isGladius) return CP_MULTIPLIERS.gladius[key];

  // Untamed or untamed rewards
  const isUntamed = edition === getEditionId("untamed");
  const isUntamedTier = tier === untamedTier;
  if (isUntamed || isUntamedTier) return CP_MULTIPLIERS.untamed[key];

  // Special treatment for untamed promos tier 3 should not exist
  if (tier === 3) return CP_MULTIPLIERS.untamed_promo[key];

  // Alpha
  const isAlpha = edition === getEditionId("alpha");
  const isAlphaTier = tier === getTier("alpha")!;
  const isPromo = edition === getEditionId("promo");

  if (isAlpha || (isPromo && isAlphaTier)) return CP_MULTIPLIERS.alpha[key];

  // Beta Promos
  const isBetaTier = tier === getTier("beta")!;
  if (isPromo && isBetaTier) return CP_MULTIPLIERS.beta_promo[key];

  return CP_MULTIPLIERS.beta[key];
}

/**
 * Calculate CP value for a card.
 * @param rarity
 * @param foil
 * @param bcx
 * @param edition
 * @param tier
 */
function calculateCp(
  rarity: number,
  foil: number,
  bcx: number,
  edition: number,
  tier: number | null
): number {
  const isFoundation =
    edition === getEditionId("foundation") || edition === getEditionId("soulbound foundation");
  if (bcx === 0 || isFoundation) return 0;
  const cardRarity = getRarityById(rarity)?.name as CardRarity | undefined;
  if (!cardRarity) return 0;
  const cardFoil = cardFoilOptions[foil] as CardFoil;

  // in this case it either regular / gold or black foil
  // gold arcane and black arcane are also gold or black for cp calculation
  const cpFoilKey = FOIL_TO_CP_KEY[cardFoil];
  // CP foil index: Regular=0, Gold=1, Black=2
  const cpBase = CP_PER_BCX[cardRarity][cpFoilKey] ?? 0;

  const multiplier = getCpMultiplier(edition, tier, foil);

  // if it's a black/black arcane or gold arcanes we know it's a max so we can increase it with 5%
  let maxBonus = 1;
  if (cardFoil === "black" || cardFoil === "black arcane" || cardFoil === "gold arcane") {
    maxBonus = 1.05;
  }

  return cpBase * bcx * multiplier * maxBonus;
}

// ---------------------------------------------------------------------------
// Flatten + compute
// ---------------------------------------------------------------------------

function flattenAndCompute(cards: SplCardDetail[], settings: SplSettings): CardDistributionRow[] {
  const rows: CardDistributionRow[] = [];

  for (const card of cards) {
    for (const dist of card.distribution) {
      const numCards = Number.parseInt(dist.num_cards, 10) || 0;
      const numBurned = Number.parseInt(dist.num_burned, 10) || 0;
      const unboundCards = isSoulbound(dist.edition)
        ? Number.parseInt(dist.unbound_cards, 10) || 0
        : numCards;
      const totalXp = Number.parseInt(dist.total_xp, 10) || 0;
      const totalBurnedXp = Number.parseInt(dist.total_burned_xp, 10) || 0;
      const isGold = dist.gold;

      const bcx = determineBcx(dist.edition, card.tier, card.rarity, isGold, totalXp, settings);
      const burnedBcx = determineBcx(
        dist.edition,
        card.tier,
        card.rarity,
        isGold,
        totalBurnedXp,
        settings
      );
      const cp = calculateCp(card.rarity, dist.foil, bcx, dist.edition, card.tier);

      rows.push({
        cardDetailId: card.id,
        name: card.name,
        rarity: card.rarity,
        rarityName: RARITY_NAMES[card.rarity] ?? `Rarity ${card.rarity}`,
        tier: card.tier,
        edition: dist.edition,
        editionLabel: getEditionLabel(dist.edition) ?? `Edition ${dist.edition}`,
        foil: dist.foil,
        foilLabel: FOIL_LABELS[dist.foil] ?? `Foil ${dist.foil}`,
        foilCategory: getFoilCategory(dist.foil),
        color: card.color ?? "",
        secondaryColor: card.secondary_color ?? undefined,
        role: card.type ?? "Monster",
        numCards,
        numBurned,
        unboundCards,
        bcx,
        burnedBcx,
        cp,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/** Fetch and compute all card distribution rows. Cached for 1 hour. */
export async function getCardStatsRows(): Promise<CardDistributionRow[]> {
  "use cache";
  cacheLife("hours");

  const [cards, settings] = await Promise.all([fetchCardDetails(), fetchSettings()]);
  return flattenAndCompute(cards, settings);
}

/** Fetch all unique card name/id pairs for search autocomplete. Cached for 1 hour. */
export async function getCardNamesAction(): Promise<CardOption[]> {
  "use cache";
  cacheLife("hours");

  const cards = await fetchCardDetails();
  const seen = new Set<number>();
  const result: CardOption[] = [];
  for (const c of cards) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      result.push({ cardDetailId: c.id, cardName: c.name });
    }
  }
  return result.sort((a, b) => a.cardName.localeCompare(b.cardName));
}
