import type { LeagueBracket } from "@/types/buy-missing-cc";

const SINGLE = (value: number): readonly [number, number] => [value, value] as const;

export const LEAGUE_BRACKETS: Record<
  LeagueBracket,
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

export function rarityNameById(rarity: number): keyof (typeof LEAGUE_BRACKETS)["wood"]["byRarity"] {
  if (rarity === 2) return "rare";
  if (rarity === 3) return "epic";
  if (rarity === 4) return "legendary";
  return "common";
}

export function getBracketLevelRange(
  bracket: LeagueBracket,
  rarity: number
): readonly [number, number] {
  const rarityName = rarityNameById(rarity);
  return LEAGUE_BRACKETS[bracket].byRarity[rarityName];
}
