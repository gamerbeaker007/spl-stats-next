"use server";

import { fetchCardDetails, fetchSettings } from "@/lib/backend/api/spl/spl-api";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";
import type { CardDistributionRow, FoilCategory } from "@/types/card-stats";
import { getEditionLabel } from "@/lib/shared/edition-utils";
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

function getFoilCategory(foil: number): FoilCategory {
  if (foil === 0) return "regular";
  if (foil === 1) return "gold";
  if (foil === 2) return "gold-arcane";
  if (foil === 3) return "black";
  return "black-arcane"; // foil === 4
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
  cardDetailId: number,
  xp: number,
  settings: SplSettings
): number {
  if (xp === 0) return 0;

  // Untamed (4) and any card from Untamed era onward (tier ≥ 4): BCX = XP directly.
  if (edition === 4 || (tier !== null && tier >= 4)) {
    return xp;
  }

  // Determine which XP threshold to use.
  let xpThresholds: number[];
  if (edition === 0 || (edition === 2 && cardDetailId < 100)) {
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

/** CP base value per BCX, indexed by [rarity-1][foilCpIndex]. */
const CP_PER_BCX = [
  [5, 125, 625],
  [20, 500, 2500],
  [100, 2500, 12500],
  [500, 12500, 62500],
] as const;

const CP_MULTIPLIERS = {
  gladius: { regular: 6, gold: 12 },
  untamed: { regular: 2, gold: 4 },
  untamed_promo: { regular: 6, gold: 12 },
  alpha: { regular: 6, gold: 12 },
  beta: { regular: 3, gold: 6 },
  beta_promo: { regular: 6, gold: 12 },
} as const;

function getCpMultiplier(
  edition: number,
  tier: number | null,
  cardDetailId: number,
  isGold: boolean
): number {
  const key = isGold ? "gold" : "regular";
  if (edition >= 7 || (tier !== null && tier > 4)) return 1;
  if (edition === 6) return CP_MULTIPLIERS.gladius[key];
  if (edition === 4 || tier === 4) return CP_MULTIPLIERS.untamed[key];
  if (tier === 3) return CP_MULTIPLIERS.untamed_promo[key];
  if (edition === 0 || (edition === 2 && cardDetailId < 100)) return CP_MULTIPLIERS.alpha[key];
  if (edition === 2 && cardDetailId < 206) return CP_MULTIPLIERS.beta_promo[key];
  return CP_MULTIPLIERS.beta[key];
}

function calculateCp(
  rarity: number,
  foil: number,
  bcx: number,
  edition: number,
  tier: number | null,
  cardDetailId: number
): number {
  if (bcx === 0) return 0;
  // CP foil index: Regular=0, Gold=1, Black=2
  const cpFoilIndex = foil === 0 ? 0 : foil <= 2 ? 1 : 2;
  const isGold = foil > 0;
  const cpBase = CP_PER_BCX[rarity - 1]?.[cpFoilIndex] ?? 0;
  const multiplier = getCpMultiplier(edition, tier, cardDetailId, isGold);
  return cpBase * bcx * multiplier;
}

// ---------------------------------------------------------------------------
// Flatten + compute
// ---------------------------------------------------------------------------

function flattenAndCompute(cards: SplCardDetail[], settings: SplSettings): CardDistributionRow[] {
  const rows: CardDistributionRow[] = [];

  for (const card of cards) {
    for (const dist of card.distribution) {
      const numCards = parseInt(dist.num_cards, 10) || 0;
      const numBurned = parseInt(dist.num_burned, 10) || 0;
      const unboundCards = parseInt(dist.unbound_cards, 10) || 0;
      const totalXp = parseInt(dist.total_xp, 10) || 0;
      const totalBurnedXp = parseInt(dist.total_burned_xp, 10) || 0;
      const isGold = dist.gold;

      const bcx = determineBcx(
        dist.edition,
        card.tier,
        card.rarity,
        isGold,
        card.id,
        totalXp,
        settings
      );
      const burnedBcx = determineBcx(
        dist.edition,
        card.tier,
        card.rarity,
        isGold,
        card.id,
        totalBurnedXp,
        settings
      );
      const cp = calculateCp(card.rarity, dist.foil, bcx, dist.edition, card.tier, card.id);

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
