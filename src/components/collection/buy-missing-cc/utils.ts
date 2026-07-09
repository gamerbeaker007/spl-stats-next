import { getBracketLevelRange } from "@/lib/shared/league-brackets";
import { getFoilLabel } from "@/lib/shared/card-utils";
import type { League } from "@/types/buy-missing-cc";
import type { CardFoil, CardRarity } from "@/types/card";

export function isMaxOnlyFoil(foil: CardFoil): boolean {
  return foil === "black" || foil === "gold arcane" || foil === "black arcane";
}

export function bracketStatus(level: number, bracket: League, rarity: CardRarity) {
  const [min, max] = getBracketLevelRange(bracket, rarity);
  if (level >= max) return "max" as const;
  if (level >= min) return "in-bracket" as const;
  return "below-bracket" as const;
}

export function getShortFoilLabel(foil: CardFoil): string {
  if (foil === "regular") return "R";
  if (foil === "gold") return "G";
  if (foil === "gold arcane") return "GV";
  if (foil === "black") return "B";
  if (foil === "black arcane") return "BV";
  return getFoilLabel(foil);
}
