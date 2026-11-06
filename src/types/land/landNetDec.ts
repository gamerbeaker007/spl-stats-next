/**
 * Shapes for the dashboard "Land net DEC" estimate.
 *
 * Raw shapes mirror the subset of `GET vapi.splinterlands.com/land/deeds?player=…`
 * the calculation reads; the response carries many more fields.
 */

export interface LandRecipeItemRaw {
  symbol: string;
  qty: number;
}

/** One row of `worksite_details` (one per developed deed). */
export interface LandWorksiteDetailRaw {
  deed_uid: string;
  /** Produced resource: `GRAIN`, `WOOD`, `STONE`, `IRON`, `RESEARCH`, `AURA`, `SPS`, `TAX`. */
  token_symbol: string | null;
  worksite_type?: string | null;
  is_construction?: boolean | null;
  /** Gross production per hour, before the region tax. */
  rewards_per_hour?: number | null;
  /** Grain consumed per hour, food discounts already applied by SPL. */
  grain_req_per_hour?: number | null;
  site_efficiency?: number | null;
  /** Extra resources consumed per base PP per hour (Research Hut, Aura Lab, Shard Mine). */
  resource_recipe?: LandRecipeItemRaw[] | null;
}

/** One row of `staking_details` (one per deed). */
export interface LandStakingDetailRaw {
  deed_uid: string;
  total_base_pp_after_cap?: number | null;
}

export interface LandPlayerDeedsRaw {
  worksite_details: LandWorksiteDetailRaw[];
  staking_details: LandStakingDetailRaw[];
}

export interface LandNetDecResourceRow {
  resource: string;
  /** Produced per hour after the region tax. */
  producedPerHour: number;
  consumedPerHour: number;
  /** DEC per unit (trade hub pool; AURA via Midnight Potion), `null` when unpriced. */
  priceDec: number | null;
  /** `(produced − consumed) × price`; 0 when unpriced. */
  netDecPerHour: number;
}

/** AURA valued via the Midnight Potion market price (1 potion = 40 AURA). */
export interface LandAuraValuation {
  /** Lowest Midnight Potion listing, USD. */
  midnightPotionUsd: number;
  decUsd: number;
  auraPriceDec: number;
}

export interface LandNetDecSummary {
  rows: LandNetDecResourceRow[];
  netDecPerHour: number;
  /** Worksites counted (TAX / Keep / Castle excluded). */
  worksiteCount: number;
  /** Produced or consumed resources without a trade hub price, valued at 0. */
  unpricedResources: string[];
  /** AURA valuation used, `null` when no potion price was available. */
  aura: LandAuraValuation | null;
}
