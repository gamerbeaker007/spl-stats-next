import { describe, expect, it } from "vitest";
import { matchesCardFilter, type FilterableCard } from "@/lib/shared/card-filter-utils";
import { DEFAULT_UNIFIED_FILTER } from "@/types/card-filter";

function betaPromoCard(cardDetailId: number): FilterableCard {
  return {
    cardDetailId,
    edition: 2,
    tier: 1,
    rarity: "common",
    color: "red",
    role: "unit",
    subType: "Fire",
    abilities: ["Flying", "Sneak"],
  };
}

describe("matchesCardFilter", () => {
  it("filters card, bloodline and ability multi-selections", () => {
    const filter = {
      ...DEFAULT_UNIFIED_FILTER,
      selectedCardDetailIds: [116, 120],
      selectedCardDetailId: 116,
      bloodlines: ["Fire", "Water"],
      abilities: ["Flying"],
    };

    expect(matchesCardFilter(betaPromoCard(116), filter)).toBe(true);
    expect(matchesCardFilter(betaPromoCard(120), filter)).toBe(true);
    expect(matchesCardFilter(betaPromoCard(121), filter)).toBe(false);
    expect(
      matchesCardFilter({ ...betaPromoCard(116), subType: "Water", abilities: ["Sneak"] }, filter)
    ).toBe(false);
  });

  it("excludes Beta Orb IDs from regular Beta Promo and includes the inclusive Orb range separately", () => {
    const regularBetaPromoFilter = {
      ...DEFAULT_UNIFIED_FILTER,
      promoTiers: [1],
    };
    const betaOrbFilter = {
      ...DEFAULT_UNIFIED_FILTER,
      betaOrbPromo: true,
    };

    expect(matchesCardFilter(betaPromoCard(115), regularBetaPromoFilter)).toBe(true);
    expect(matchesCardFilter(betaPromoCard(116), regularBetaPromoFilter)).toBe(false);
    expect(matchesCardFilter(betaPromoCard(129), regularBetaPromoFilter)).toBe(false);
    expect(matchesCardFilter(betaPromoCard(130), regularBetaPromoFilter)).toBe(true);

    expect(matchesCardFilter(betaPromoCard(115), betaOrbFilter)).toBe(false);
    expect(matchesCardFilter(betaPromoCard(116), betaOrbFilter)).toBe(true);
    expect(matchesCardFilter(betaPromoCard(129), betaOrbFilter)).toBe(true);
    expect(matchesCardFilter(betaPromoCard(130), betaOrbFilter)).toBe(false);
  });
});
