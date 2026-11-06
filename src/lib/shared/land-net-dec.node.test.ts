import { calculateLandNetDec, valueAuraViaMidnightPotion } from "@/lib/shared/land-net-dec";
import { describe, expect, it } from "vitest";

const pools = [
  { token_symbol: "GRAIN", resource_price: 0.01 },
  { token_symbol: "WOOD", resource_price: 0.02 },
  { token_symbol: "STONE", resource_price: 0.05 },
  { token_symbol: "IRON", resource_price: 0.2 },
  { token_symbol: "SPS", resource_price: 8 },
];

describe("calculateLandNetDec", () => {
  it("applies the region tax to production and values the net at the pool price", () => {
    const result = calculateLandNetDec(
      {
        worksite_details: [
          {
            deed_uid: "a",
            token_symbol: "WOOD",
            rewards_per_hour: 100,
            grain_req_per_hour: 50,
            site_efficiency: 1,
            resource_recipe: [],
          },
        ],
        staking_details: [{ deed_uid: "a", total_base_pp_after_cap: 10_000 }],
      },
      pools
    );

    const wood = result.rows.find((r) => r.resource === "WOOD")!;
    const grain = result.rows.find((r) => r.resource === "GRAIN")!;
    expect(wood.producedPerHour).toBeCloseTo(90);
    expect(wood.netDecPerHour).toBeCloseTo(90 * 0.02);
    expect(grain.consumedPerHour).toBe(50);
    expect(grain.netDecPerHour).toBeCloseTo(-50 * 0.01);
    expect(result.netDecPerHour).toBeCloseTo(1.8 - 0.5);
    expect(result.worksiteCount).toBe(1);
  });

  it("charges recipe resources per base PP and skips TAX worksites", () => {
    const result = calculateLandNetDec(
      {
        worksite_details: [
          {
            deed_uid: "sps",
            token_symbol: "SPS",
            rewards_per_hour: 1,
            grain_req_per_hour: 100,
            site_efficiency: 0.5,
            resource_recipe: [
              { symbol: "WOOD", qty: 0.005 },
              { symbol: "IRON", qty: 0.0005 },
            ],
          },
          { deed_uid: "keep", token_symbol: "TAX", rewards_per_hour: 999 },
        ],
        staking_details: [{ deed_uid: "sps", total_base_pp_after_cap: 1000 }],
      },
      pools
    );

    expect(result.worksiteCount).toBe(1);
    expect(result.rows.find((r) => r.resource === "TAX")).toBeUndefined();
    expect(result.rows.find((r) => r.resource === "WOOD")!.consumedPerHour).toBeCloseTo(2.5);
    expect(result.rows.find((r) => r.resource === "IRON")!.consumedPerHour).toBeCloseTo(0.25);
  });

  it("only consumes grain while under construction and reports unpriced resources", () => {
    const result = calculateLandNetDec(
      {
        worksite_details: [
          {
            deed_uid: "lab",
            token_symbol: "AURA",
            is_construction: true,
            rewards_per_hour: 0,
            grain_req_per_hour: 20,
            site_efficiency: 1,
            resource_recipe: [{ symbol: "WOOD", qty: 0.005 }],
          },
        ],
        staking_details: [{ deed_uid: "lab", total_base_pp_after_cap: 1000 }],
      },
      pools
    );

    expect(result.rows.map((r) => r.resource)).toEqual(["GRAIN"]);
    expect(result.unpricedResources).toEqual([]);

    const producing = calculateLandNetDec(
      {
        worksite_details: [{ deed_uid: "lab", token_symbol: "AURA", rewards_per_hour: 5 }],
        staking_details: [],
      },
      pools
    );
    expect(producing.unpricedResources).toEqual(["AURA"]);
    expect(producing.netDecPerHour).toBe(0);
  });

  it("values AURA via the Midnight Potion price", () => {
    const aura = valueAuraViaMidnightPotion(0.04, 0.001)!;
    expect(aura.auraPriceDec).toBeCloseTo(1); // 0.04 USD / 0.001 USD per DEC / 40 AURA
    expect(valueAuraViaMidnightPotion(0, 0.001)).toBeNull();

    const result = calculateLandNetDec(
      {
        worksite_details: [{ deed_uid: "lab", token_symbol: "AURA", rewards_per_hour: 10 }],
        staking_details: [],
      },
      pools,
      aura
    );
    expect(result.unpricedResources).toEqual([]);
    expect(result.netDecPerHour).toBeCloseTo(9); // 10 × 0.9 tax × 1 DEC
  });
});
