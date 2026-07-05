import type {
  BuildPurchasePlanInput,
  BuildPurchasePlanOutput,
  BuyMissingCcListing,
  ListingSelection,
  TargetLevelPreview,
  UpgradeRequirements,
} from "@/types/buy-missing-cc";
import type { CardStats } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";

export function calculateUpgradeRequirements(
  currentCc: number,
  targetLevel: number,
  combineRates: number[]
): UpgradeRequirements {
  const safeLevel = Math.min(Math.max(1, targetLevel), combineRates.length);
  const targetCc = combineRates[safeLevel - 1] ?? 0;
  const missingCc = Math.max(0, targetCc - Math.max(0, currentCc));
  return { targetCc, missingCc };
}

export function calculateUpgradeCostEstimate(
  missingCc: number,
  lowPricePerBcxUsd: number | null
): { usd: number } {
  if (missingCc <= 0 || !lowPricePerBcxUsd || lowPricePerBcxUsd <= 0) {
    return { usd: 0 };
  }

  return { usd: missingCc * lowPricePerBcxUsd };
}

function normalizeFoilForRates(foil: number): number {
  if (foil === 2) return 1;
  if (foil === 4) return 3;
  return foil;
}

function getLegacyBaseXp(
  settings: SplSettings,
  edition: number,
  foil: number,
  rarityIdx: number
): number {
  const normalizedFoil = normalizeFoilForRates(foil);
  const isAlphaEdition = edition === 0;

  if (normalizedFoil === 1) {
    const goldArray = isAlphaEdition ? settings.gold_xp : settings.beta_gold_xp;
    return goldArray?.[rarityIdx] ?? 0;
  }

  const regularArray = isAlphaEdition ? settings.alpha_xp : settings.beta_xp;
  return regularArray?.[rarityIdx] ?? 0;
}

export function getCombineRatesForCard(
  settings: SplSettings,
  edition: number,
  foil: number,
  rarity: number,
  tier?: number | null
): number[] | null {
  const rarityIdx = Math.max(0, Math.min(3, rarity - 1));
  const normalizedFoil = normalizeFoilForRates(foil);

  // Promo (2), Reward (3), and Extras (17) cards are cross-era and must resolve
  // their actual combine source from the card tier (set primary edition id).
  let resolvedEdition = edition;
  if ((edition === 2 || edition === 3 || edition === 17) && typeof tier === "number" && tier > 0) {
    resolvedEdition = tier;
  }

  if (resolvedEdition === 15 || resolvedEdition === 16) {
    const table =
      normalizedFoil === 1
        ? settings.foundations_combine_rates_gold
        : settings.foundations_combine_rates;
    return table?.[rarityIdx] ?? null;
  }

  if (resolvedEdition >= 4) {
    const table = normalizedFoil === 1 ? settings.combine_rates_gold : settings.combine_rates;
    return table?.[rarityIdx] ?? null;
  }

  if (resolvedEdition >= 0 && resolvedEdition <= 1) {
    const xpLevels = settings.xp_levels?.[rarityIdx] ?? [];
    const baseXp = getLegacyBaseXp(settings, resolvedEdition, normalizedFoil, rarityIdx);
    if (!baseXp || baseXp <= 0) return null;

    const converted = [1, ...xpLevels.map((xp) => Math.ceil(xp / baseXp) + 1)];
    return converted;
  }

  return null;
}

export function getCardMaxLevel(combineRates: number[]): number {
  //always the highest level in the combine rates table, or 0 if the table is empty
  return combineRates[combineRates.length - 1] ?? 0;
}

export function selectCheapestListings(
  listings: BuyMissingCcListing[],
  requiredCc: number
): ListingSelection {
  if (requiredCc <= 0 || listings.length === 0) {
    return { selected: [], totalCc: 0, totalDec: 0, totalUsd: 0, exact: requiredCc === 0 };
  }

  const sorted = [...listings].sort((a, b) => {
    if (a.pricePerCcDec !== b.pricePerCcDec) return a.pricePerCcDec - b.pricePerCcDec;
    return a.priceDec - b.priceDec;
  });

  const best: Array<{ cost: number; indices: number[] } | null> = Array(requiredCc + 1).fill(null);
  best[0] = { cost: 0, indices: [] };

  for (let i = 0; i < sorted.length; i += 1) {
    const listing = sorted[i];
    for (let cc = requiredCc; cc >= 0; cc -= 1) {
      const prev = best[cc];
      if (!prev) continue;

      const nextCc = Math.min(requiredCc, cc + Math.max(1, listing.cc));
      if (cc + listing.cc > requiredCc) continue;

      const nextCost = prev.cost + listing.priceDec;
      const existing = best[nextCc];
      if (!existing || nextCost < existing.cost) {
        best[nextCc] = { cost: nextCost, indices: [...prev.indices, i] };
      }
    }
  }

  let chosenCc = requiredCc;
  while (chosenCc > 0 && !best[chosenCc]) chosenCc -= 1;

  const chosen = best[chosenCc];
  if (!chosen) {
    return { selected: [], totalCc: 0, totalDec: 0, totalUsd: 0, exact: false };
  }

  const selected = chosen.indices.map((index) => sorted[index]);
  const totals = selected.reduce(
    (acc, row) => {
      acc.cc += row.cc;
      acc.dec += row.priceDec;
      acc.usd += row.priceUsd;
      return acc;
    },
    { cc: 0, dec: 0, usd: 0 }
  );

  return {
    selected,
    totalCc: totals.cc,
    totalDec: totals.dec,
    totalUsd: totals.usd,
    exact: totals.cc === requiredCc,
  };
}

export function buildPurchasePlan(input: BuildPurchasePlanInput): BuildPurchasePlanOutput {
  const items = input.listings.map((row) => ({
    account: input.account,
    marketId: row.marketId,
    uid: row.uid,
    cardDetailId: row.cardDetailId,
    cardName: input.cardName,
    edition: row.edition,
    foil: row.foil,
    level: row.level,
    cc: row.cc,
    priceUsd: row.priceUsd,
    priceDec: row.priceDec,
    priceCredits: row.priceCredits,
    seller: row.seller,
  }));

  const totals = items.reduce(
    (acc, item) => {
      acc.cc += item.cc;
      acc.dec += item.priceDec;
      acc.usd += item.priceUsd;
      return acc;
    },
    { cc: 0, dec: 0, usd: 0 }
  );

  return { items, totals };
}

function statAtLevel(values: number[] | undefined, level: number): number {
  if (!values || values.length === 0) return 0;
  const index = Math.max(0, Math.min(values.length - 1, level - 1));
  return values[index] ?? 0;
}

export function buildTargetLevelPreview(
  stats: CardStats,
  currentLevel: number,
  targetLevel: number,
  currentCc: number,
  targetCc: number,
  missingCc: number
): TargetLevelPreview {
  const statKeys: Array<keyof Omit<CardStats, "abilities">> = [
    "mana",
    "attack",
    "ranged",
    "magic",
    "armor",
    "health",
    "speed",
  ];

  const currentStats: Partial<Record<keyof Omit<CardStats, "abilities">, number>> = {};
  const targetStats: Partial<Record<keyof Omit<CardStats, "abilities">, number>> = {};

  for (const key of statKeys) {
    currentStats[key] = statAtLevel(stats[key], currentLevel);
    targetStats[key] = statAtLevel(stats[key], targetLevel);
  }

  const currentAbilities = new Set(stats.abilities?.[Math.max(0, currentLevel - 1)] ?? []);
  const targetAbilities = stats.abilities?.[Math.max(0, targetLevel - 1)] ?? [];
  const newAbilities = targetAbilities.filter((ability) => !currentAbilities.has(ability));

  return {
    currentLevel,
    targetLevel,
    currentCc,
    targetCc,
    missingCc,
    currentStats,
    targetStats,
    newAbilities,
  };
}
