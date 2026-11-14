import { describe, expect, it } from "vitest";
import { getCardImageByLevel, getCardImageLevel } from "@/lib/shared/card-image-utils";
import type { CardFoil, CardRarity } from "@/types/card";

describe("missing card image levels", () => {
  it.each<CardFoil>(["gold arcane", "black", "black arcane"])(
    "uses the maximum level for missing %s cards",
    (foil) => {
      expect(getCardImageLevel(foil, "common", 14, 14)).toBe(10);
      expect(
        getCardImageByLevel("Example", 14, foil, getCardImageLevel(foil, "rare", 14, 14))
      ).toContain("_lv8");
    }
  );

  it.each<[CardRarity, number]>([
    ["common", 5],
    ["rare", 4],
    ["epic", 3],
    ["legendary", 2],
  ])("uses the Foundation maximum for %s", (rarity, maxLevel) => {
    expect(getCardImageLevel("black", rarity, 15, 15)).toBe(maxLevel);
    expect(getCardImageLevel("black arcane", rarity, 17, 15)).toBe(maxLevel);
  });

  it.each<CardFoil>(["regular", "gold"])("keeps missing %s cards at level 1", (foil) => {
    expect(getCardImageLevel(foil, "legendary", 14, 14)).toBe(1);
  });

  it("preserves the owned level for every foil", () => {
    expect(getCardImageLevel("black", "common", 14, 14, 3)).toBe(3);
    expect(getCardImageLevel("gold", "common", 14, 14, 4)).toBe(4);
  });
});
