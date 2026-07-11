import { getRarityId } from "@/lib/shared/rarity-utils";
import type {
  BuildPurchasePlanInput,
  BuildPurchasePlanOutput,
  BuyMissingCcListing,
  ListingSelection,
  TargetLevelPreview,
  UpgradeRequirements,
} from "@/types/buy-missing-cc";
import { CardDetail, CardFoil, CardRarity } from "@/types/card";
import type { CardStats } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";

export function getCardFirstPlayableLevel(combineRates: number[]): number {
  const firstLevelIndex = combineRates.findIndex((cc) => cc > 0);
  return firstLevelIndex >= 0 ? firstLevelIndex + 1 : 1;
}

export function calculateUpgradeRequirements(
  currentCc: number,
  targetLevel: number,
  combineRates: number[]
): UpgradeRequirements {
  if (combineRates.length === 0) {
    return { targetCc: 0, missingCc: 0 };
  }

  const firstPlayableLevel = getCardFirstPlayableLevel(combineRates);
  const safeLevel = Math.min(Math.max(firstPlayableLevel, targetLevel), combineRates.length);
  const targetCc = combineRates[safeLevel - 1] ?? 0;
  const missingCc = Math.max(0, targetCc - Math.max(0, currentCc));
  return { targetCc, missingCc };
}

export function calculateUpgradeCostEstimate(
  missingCc: number,
  pricePerBcx: number | null
): { usd: number } {
  if (missingCc <= 0 || !pricePerBcx || pricePerBcx <= 0) {
    return { usd: 0 };
  }

  return { usd: missingCc * pricePerBcx };
}

function normalizeFoilForRates(foil: CardFoil): CardFoil {
  return foil === "regular" ? foil : "gold";
}

function getLegacyBaseXp(
  settings: SplSettings,
  edition: number,
  foil: CardFoil,
  rarityIdx: number
): number {
  const normalizedFoil = normalizeFoilForRates(foil);
  const isAlphaEdition = edition === 0;

  if (normalizedFoil === "gold") {
    const goldArray = isAlphaEdition ? settings.gold_xp : settings.beta_gold_xp;
    return goldArray?.[rarityIdx] ?? 0;
  }

  const regularArray = isAlphaEdition ? settings.alpha_xp : settings.beta_xp;
  return regularArray?.[rarityIdx] ?? 0;
}

function buildLegacyGoldCombineRates(xpLevels: number[], baseXp: number): number[] {
  const firstGoldLevel = xpLevels.reduce((highestLevel, requiredXp, index) => {
    if (requiredXp <= baseXp) {
      return index + 2;
    }
    return highestLevel;
  }, 1);

  return Array.from({ length: xpLevels.length + 1 }, (_value, index) => {
    const level = index + 1;
    if (level < firstGoldLevel) return 0;
    if (level === 1) return 1;

    const requiredXp = xpLevels[level - 2] ?? 0;
    return Math.max(1, Math.ceil(requiredXp / baseXp));
  });
}

export function getCombineRatesForCard(
  settings: SplSettings,
  edition: number,
  foil: CardFoil,
  rarity: CardRarity,
  tier: number
): number[] | null {
  const rarityIdx = Math.max(0, Math.min(3, getRarityId(rarity)! - 1));

  // we only know "regular" and gold combine rates
  const normalizedFoil = normalizeFoilForRates(foil);

  // Promo (2), Reward (3), and Extras (17) cards are cross-era and must resolve
  // their actual combine source from the card tier (set primary edition id).
  let resolvedEdition = edition;
  if ((edition === 2 || edition === 3 || edition === 17) && typeof tier === "number" && tier > 0) {
    resolvedEdition = tier;
  }

  // Foundation editions have special combine rates
  if (resolvedEdition === 15 || resolvedEdition === 16) {
    const table =
      normalizedFoil === "gold"
        ? settings.foundations_combine_rates_gold
        : settings.foundations_combine_rates;
    return table?.[rarityIdx] ?? null;
  }

  if (resolvedEdition >= 4) {
    const table = normalizedFoil === "gold" ? settings.combine_rates_gold : settings.combine_rates;
    return table?.[rarityIdx] ?? null;
  }

  if (resolvedEdition >= 0 && resolvedEdition <= 1) {
    const xpLevels = settings.xp_levels?.[rarityIdx] ?? [];
    const baseXp = getLegacyBaseXp(settings, resolvedEdition, normalizedFoil, rarityIdx);
    if (!baseXp || baseXp <= 0) return null;

    if (normalizedFoil === "gold") {
      return buildLegacyGoldCombineRates(xpLevels, baseXp);
    }

    return [1, ...xpLevels.map((xp) => Math.ceil(xp / baseXp) + 1)];
  }

  return null;
}

export function getCardMaxLevel(combineRates: number[]): number {
  return combineRates.length;
}

export function getCardMaxCc(combineRates: number[]): number {
  return combineRates.at(-1) ?? 0;
}

export function selectCheapestListings(
  listings: BuyMissingCcListing[],
  requiredCc: number
): ListingSelection {
  if (requiredCc <= 0 || listings.length === 0) {
    return {
      selected: [],
      totalCc: 0,
      totalDec: 0,
      totalUsd: 0,
      exact: requiredCc === 0,
      fulfilled: requiredCc === 0,
    };
  }

  const sorted = listings
    .filter((listing) => listing.cc > 0)
    .sort((a, b) => {
      if (a.pricePerCcDec !== b.pricePerCcDec) return a.pricePerCcDec - b.pricePerCcDec;
      return a.priceDec - b.priceDec;
    });

  const maxListingCc = Math.max(...sorted.map((listing) => listing.cc), 0);
  if (maxListingCc <= 0) {
    return {
      selected: [],
      totalCc: 0,
      totalDec: 0,
      totalUsd: 0,
      exact: false,
      fulfilled: false,
    };
  }

  const maxCc = requiredCc + maxListingCc - 1;
  const best: Array<{ cost: number; indices: number[] } | null> = Array(maxCc + 1).fill(null);
  best[0] = { cost: 0, indices: [] };

  for (let i = 0; i < sorted.length; i += 1) {
    const listing = sorted[i];
    for (let cc = maxCc - listing.cc; cc >= 0; cc -= 1) {
      const prev = best[cc];
      if (!prev) continue;

      const nextCc = cc + listing.cc;
      const nextCost = prev.cost + listing.priceDec;
      const existing = best[nextCc];
      if (!existing || nextCost < existing.cost) {
        best[nextCc] = { cost: nextCost, indices: [...prev.indices, i] };
      }
    }
  }

  let chosenCc = -1;
  for (let cc = requiredCc; cc < best.length; cc += 1) {
    const candidate = best[cc];
    if (!candidate) continue;

    const chosen = chosenCc >= 0 ? best[chosenCc] : null;
    if (
      !chosen ||
      candidate.cost < chosen.cost ||
      (candidate.cost === chosen.cost && cc < chosenCc)
    ) {
      chosenCc = cc;
    }
  }

  const chosen = chosenCc >= 0 ? best[chosenCc] : null;
  if (!chosen) {
    return { selected: [], totalCc: 0, totalDec: 0, totalUsd: 0, exact: false, fulfilled: false };
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
    fulfilled: totals.cc >= requiredCc,
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

export type CombineDisabledReason = "max-level" | "not-enough-copies" | "in-set" | "on-wagon";

export type CombineCardState = Pick<CardDetail, "uid" | "level" | "bcx" | "onWagon" | "inSet">;

export interface CombineStatus {
  canCombine: boolean;
  canOpenDialog: boolean;
  disabledReason: CombineDisabledReason | null;
  currentLevel: number;
  targetLevel: number;
  nextLevel: number;
  maxReachableLevel: number;
  currentCc: number;
  nextLevelCcRequired: number;
  copiesNeeded: number;
  cardUids: string[];
  /** Highest usable level due to wagon restrictions (null if no restriction) */
  maxLevelDueToWagon?: number | null;
  onWagonCount: number;
}

type CombineTooltipStatus = Pick<
  CombineStatus,
  "canCombine" | "disabledReason" | "copiesNeeded" | "onWagonCount"
>;

export function getCombineTooltipText(options: {
  isLoading: boolean;
  combineStatus: CombineTooltipStatus | null;
}): string {
  const { isLoading, combineStatus } = options;

  if (isLoading) {
    return "Loading...";
  }

  if (combineStatus?.canCombine) {
    return "Combine cards";
  }

  const disabledReasonText = {
    "max-level": "Already at maximum level",
    "not-enough-copies": `Need ${combineStatus?.copiesNeeded ?? 0} more BCX to level up`,
    "in-set": "Some cards are part of a set",
    "on-wagon": `Too many cards on wagon (${combineStatus?.onWagonCount ?? 0} BCX on wagons)`,
  };

  return (
    disabledReasonText[combineStatus?.disabledReason as keyof typeof disabledReasonText] ||
    "Cannot combine this card"
  );
}

function buildCombineContext(allCards: CombineCardState[]) {
  const sortedByBasePriority = [...allCards].sort((a, b) => {
    const levelDelta = (b.level ?? 0) - (a.level ?? 0);
    if (levelDelta !== 0) return levelDelta;
    return (b.bcx ?? 0) - (a.bcx ?? 0);
  });

  const baseUid = sortedByBasePriority[0]?.uid;
  const onWagonCount = allCards.reduce((sum, card) => {
    if (!card.onWagon || card.uid === baseUid) return sum;
    return sum + Math.max(0, card.bcx ?? 0);
  }, 0);

  return {
    cardUids: allCards.map((card) => card.uid),
    inSet: allCards.some((card) => card.inSet),
    onWagonCount,
  };
}

/**
 * Single source of truth for combine validation.
 * - Without `targetLevel`, validates dialog/open + next-level combine.
 * - With `targetLevel`, validates that specific target level.
 */
export function checkCombineStatus(options: {
  combineRates: number[];
  currentLevel: number;
  totalOwnedCc: number;
  allCards: CombineCardState[];
  targetLevel?: number;
}): CombineStatus {
  const { combineRates, currentLevel, totalOwnedCc, allCards, targetLevel } = options;
  const maxLevel = getCardMaxLevel(combineRates);
  const { cardUids, inSet, onWagonCount } = buildCombineContext(allCards);

  const nextLevel = Math.min(currentLevel + 1, maxLevel);
  const desiredTargetLevel = targetLevel ?? nextLevel;
  const safeTargetLevel = Math.min(Math.max(nextLevel, desiredTargetLevel), maxLevel);

  // The highest-level card (base) is exempt — it stays usable even on a wagon.
  const usableCC = Math.max(0, totalOwnedCc - onWagonCount);

  let maxLevelReachable = currentLevel;
  let maxLevelReachableDueToWagon = currentLevel;

  for (let level = currentLevel + 1; level <= maxLevel; level += 1) {
    const requiredCc = combineRates[level - 1] ?? 0;
    if (totalOwnedCc >= requiredCc) {
      maxLevelReachable = level;
    } else {
      break;
    }

    if (usableCC >= requiredCc) {
      maxLevelReachableDueToWagon = level;
    } else {
      break;
    }
  }

  const canOpenDialog = currentLevel < maxLevel && !inSet && maxLevelReachable > currentLevel;
  const targetLevelCcRequired = combineRates[safeTargetLevel - 1] ?? 0;
  const nextLevelCcRequired = combineRates[nextLevel - 1] ?? 0;

  if (currentLevel >= maxLevel) {
    return {
      canCombine: false,
      canOpenDialog: false,
      disabledReason: "max-level",
      currentLevel,
      targetLevel: maxLevel,
      nextLevel,
      maxReachableLevel: maxLevel,
      currentCc: totalOwnedCc,
      nextLevelCcRequired,
      copiesNeeded: 0,
      cardUids,
      maxLevelDueToWagon: null,
      onWagonCount,
    };
  }

  if (inSet) {
    return {
      canCombine: false,
      canOpenDialog: false,
      disabledReason: "in-set",
      currentLevel,
      targetLevel: safeTargetLevel,
      nextLevel,
      maxReachableLevel: maxLevelReachable,
      currentCc: totalOwnedCc,
      nextLevelCcRequired,
      copiesNeeded: 0,
      cardUids,
      maxLevelDueToWagon: null,
      onWagonCount,
    };
  }

  if (totalOwnedCc < targetLevelCcRequired) {
    return {
      canCombine: false,
      canOpenDialog,
      disabledReason: "not-enough-copies",
      currentLevel,
      targetLevel: safeTargetLevel,
      nextLevel,
      maxReachableLevel: maxLevelReachable,
      currentCc: totalOwnedCc,
      nextLevelCcRequired,
      copiesNeeded: targetLevelCcRequired - totalOwnedCc,
      cardUids,
      maxLevelDueToWagon: null,
      onWagonCount,
    };
  }

  if (usableCC < targetLevelCcRequired) {
    return {
      canCombine: false,
      canOpenDialog,
      disabledReason: "on-wagon",
      currentLevel,
      targetLevel: safeTargetLevel,
      nextLevel,
      maxReachableLevel: maxLevelReachable,
      currentCc: usableCC,
      nextLevelCcRequired,
      copiesNeeded: targetLevelCcRequired - usableCC,
      cardUids,
      maxLevelDueToWagon: null,
      onWagonCount,
    };
  }

  return {
    canCombine: true,
    canOpenDialog,
    disabledReason: null,
    currentLevel,
    targetLevel: safeTargetLevel,
    nextLevel,
    maxReachableLevel: maxLevelReachable,
    currentCc: usableCC,
    nextLevelCcRequired,
    copiesNeeded: 0,
    cardUids,
    maxLevelDueToWagon: maxLevelReachableDueToWagon,
    onWagonCount,
  };
}

/**
 * Get all levels that can currently be reached by combine validation rules.
 */
export function getCombinableLevels(options: {
  combineRates: number[];
  currentLevel: number;
  totalOwnedCc: number;
  allCards: CombineCardState[];
}): number[] {
  const { combineRates, currentLevel, totalOwnedCc, allCards } = options;
  const status = checkCombineStatus({ combineRates, currentLevel, totalOwnedCc, allCards });
  if (!status.canOpenDialog) return [];

  const levels: number[] = [];
  const maxReachableNow = status.maxLevelDueToWagon ?? status.maxReachableLevel;

  for (let level = currentLevel + 1; level <= maxReachableNow; level += 1) {
    levels.push(level);
  }

  return levels;
}

/**
 * Create the custom_json payload for combining cards.
 * This is the format expected by the SPL blockchain.
 */
export interface CombinePayload {
  cards: string[];
  app: string;
  n: string | number;
}

export function createCombinePayload(
  cardUids: string[],
  appVersion: string = "splinterlands/0.7.177"
): CombinePayload {
  // Generate a nonce to ensure uniqueness
  const nonce = Math.random().toString(36).substring(2, 15);

  return {
    cards: cardUids,
    app: appVersion,
    n: nonce,
  };
}
