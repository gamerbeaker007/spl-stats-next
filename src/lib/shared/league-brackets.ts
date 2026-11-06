import type { League } from "@/types/buy-missing-cc";
import { CardRarity } from "@/lib/shared/rarity-utils";

const SINGLE = (value: number): readonly [number, number] => [value, value] as const;

export const LEAGUE_BRACKETS: Record<
  League,
  {
    label: string;
    byRarity: {
      common: readonly [number, number];
      rare: readonly [number, number];
      epic: readonly [number, number];
      legendary: readonly [number, number];
    };
  }
> = {
  wood: {
    label: "Wood",
    byRarity: {
      common: SINGLE(1),
      rare: SINGLE(1),
      epic: SINGLE(1),
      legendary: SINGLE(1),
    },
  },
  bronze: {
    label: "Bronze",
    byRarity: {
      common: [1, 3],
      rare: [1, 3],
      epic: [1, 2],
      legendary: SINGLE(1),
    },
  },
  silver: {
    label: "Silver",
    byRarity: {
      common: [2, 5],
      rare: [1, 4],
      epic: [1, 3],
      legendary: [1, 2],
    },
  },
  gold: {
    label: "Gold",
    byRarity: {
      common: [4, 8],
      rare: [3, 7],
      epic: [2, 5],
      legendary: [2, 3],
    },
  },
  diamond: {
    label: "Diamond",
    byRarity: {
      common: [6, 10],
      rare: [5, 8],
      epic: [4, 6],
      legendary: [2, 4],
    },
  },
  champion: {
    label: "Champion",
    byRarity: {
      common: [8, 10],
      rare: [6, 8],
      epic: [5, 6],
      legendary: [3, 4],
    },
  },
};

//TODO REMOVE to rarity-utils
export function rarityNameById(rarity: number): keyof (typeof LEAGUE_BRACKETS)["wood"]["byRarity"] {
  if (rarity === 2) return "rare";
  if (rarity === 3) return "epic";
  if (rarity === 4) return "legendary";
  return "common";
}

/**
 * Editions whose cards are exempt from the bracket minimum level, matched on the
 * edition id only (any tier): Extras (17) and the upcoming set (24 — not in
 * `EDITION_DEFS` yet).
 */
export const MIN_LEVEL_EXEMPT_EDITIONS: ReadonlySet<number> = new Set([17, 24]);

/** Whether an edition ignores the bracket minimum level. */
export function isMinLevelExempt(edition: number): boolean {
  return MIN_LEVEL_EXEMPT_EDITIONS.has(edition);
}

/** `[min, max]` level of a rarity in a bracket; exempt editions have no minimum (`[1, max]`). */
export function getBracketLevelRange(
  bracket: League,
  rarity: CardRarity,
  edition: number
): readonly [number, number] {
  const [min, max] = LEAGUE_BRACKETS[bracket].byRarity[rarity];
  return isMinLevelExempt(edition) ? [1, max] : [min, max];
}
