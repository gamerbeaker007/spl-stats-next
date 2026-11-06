/**
 * Minimal per-account land "net DEC per hour" estimate.
 *
 * Mirrors the region "Production Net DEC" (`prepareSummary` + `computeNetValues`,
 * without the per-region transfer fee) in the `splinter-lands-next` reference project:
 *
 *   produced  = rewards_per_hour × (1 − region tax)
 *   consumed  = grain_req_per_hour (+ recipe: base PP × qty × site efficiency)
 *   net DEC   = Σ (produced − consumed) × trade hub DEC price
 *
 * Resources are netted across all regions and valued at the trade hub pool
 * price (`resource_price`, no swap fee). TAX worksites (Keeps / Castles) are skipped — their income is
 * a vault balance, not a per-hour rate.
 *
 * AURA has no trade hub pool: it is valued via the Midnight Potion (1 potion =
 * 40 AURA) market price.
 * Resources without any price (RESEARCH, AURA when no potion price is
 * available) are valued at 0 and reported in `unpricedResources`.
 *
 * Pure and browser-safe.
 */
import type {
  LandAuraValuation,
  LandNetDecResourceRow,
  LandNetDecSummary,
  LandPlayerDeedsRaw,
} from "@/types/land/landNetDec";

/** Share of production the region keeps as tax. */
export const LAND_PRODUCTION_TAX_RATE = 0.1;

/** Trade hub pool row: `resource_price` is DEC per 1 resource unit. */
export interface LandPoolPrice {
  token_symbol: string;
  resource_price: number;
}

/** AURA needed to craft one Midnight Potion. */
export const MIDNIGHT_POTION_AURA = 40;

const TAX_SYMBOL = "TAX";
const AURA_SYMBOL = "AURA";

/** DEC per AURA from the Midnight Potion USD price; `null` when either price is missing. */
export function valueAuraViaMidnightPotion(
  midnightPotionUsd: number,
  decUsd: number
): LandAuraValuation | null {
  if (!(midnightPotionUsd > 0) || !(decUsd > 0)) return null;
  return {
    midnightPotionUsd,
    decUsd,
    auraPriceDec: midnightPotionUsd / decUsd / MIDNIGHT_POTION_AURA,
  };
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function calculateLandNetDec(
  deeds: LandPlayerDeedsRaw,
  pools: LandPoolPrice[],
  aura: LandAuraValuation | null = null
): LandNetDecSummary {
  const prices = new Map<string, number>();
  for (const pool of pools) {
    const price = num(pool.resource_price);
    if (price > 0) prices.set(pool.token_symbol.toUpperCase(), price);
  }
  if (aura) prices.set(AURA_SYMBOL, aura.auraPriceDec);

  const basePpByDeed = new Map<string, number>();
  for (const staking of deeds.staking_details ?? []) {
    basePpByDeed.set(staking.deed_uid, num(staking.total_base_pp_after_cap));
  }

  const produced = new Map<string, number>();
  const consumed = new Map<string, number>();
  const add = (map: Map<string, number>, resource: string, amount: number) => {
    if (amount > 0) map.set(resource, (map.get(resource) ?? 0) + amount);
  };

  let worksiteCount = 0;
  for (const ws of deeds.worksite_details ?? []) {
    const resource = ws.token_symbol?.toUpperCase();
    if (!resource || resource === TAX_SYMBOL) continue;
    worksiteCount += 1;

    add(produced, resource, num(ws.rewards_per_hour) * (1 - LAND_PRODUCTION_TAX_RATE));
    add(consumed, "GRAIN", num(ws.grain_req_per_hour));

    // Under construction only grain is consumed.
    if (ws.is_construction || !Array.isArray(ws.resource_recipe)) continue;
    const basePp = basePpByDeed.get(ws.deed_uid) ?? 0;
    const efficiency = num(ws.site_efficiency);
    for (const item of ws.resource_recipe) {
      add(consumed, item.symbol.toUpperCase(), basePp * num(item.qty) * efficiency);
    }
  }

  const resources = Array.from(new Set([...produced.keys(), ...consumed.keys()])).sort();
  const unpricedResources: string[] = [];
  const rows: LandNetDecResourceRow[] = resources.map((resource) => {
    const producedPerHour = produced.get(resource) ?? 0;
    const consumedPerHour = consumed.get(resource) ?? 0;
    const priceDec = prices.get(resource) ?? null;
    if (priceDec === null) unpricedResources.push(resource);
    const netDecPerHour = priceDec === null ? 0 : (producedPerHour - consumedPerHour) * priceDec;
    return { resource, producedPerHour, consumedPerHour, priceDec, netDecPerHour };
  });

  return {
    rows,
    netDecPerHour: rows.reduce((sum, row) => sum + row.netDecPerHour, 0),
    worksiteCount,
    unpricedResources,
    aura,
  };
}
