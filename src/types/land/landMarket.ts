/**
 * Land marketplace types.
 *
 * Raw shapes mirror `GET vapi.splinterlands.com/land/deeds?status=market` and
 * `GET /land/deeds/owned/{player}`. The normalized `LandMarketListing` is what
 * every view, filter, sort and the purchase cart work from — JSON-in-string
 * fields (`stats`, `land_stats`) are parsed exactly once, server side.
 */

/** One market-listed deed exactly as returned by `/land/deeds?status=market`. */
export interface LandMarketDeedRaw {
  map_name?: string | null;
  region_id?: number | null;
  tract_id?: number | null;
  plot_id?: number | null;
  region_number?: number | null;
  tract_number?: number | null;
  plot_number?: number | null;
  territory?: string | null;
  region_uid?: string | null;
  region_name?: string | null;
  resource_id?: number | null;
  resource_symbol?: string | null;
  magic_type?: string | null;
  /** JSON string, e.g. `{"building_in_box":true,"unstable_totem":true}`. */
  stats?: string | null;
  /** JSON string, e.g. `{ "resources": ["wood"] }`. */
  land_stats?: string | null;
  deed_uid: string;
  player?: string | null;
  deed_type?: string | null;
  rarity?: string | null;
  plot_status?: string | null;
  castle?: number | null;
  keep?: number | null;
  worksite_type?: string | null;
  is_construction?: boolean | null;
  in_use?: boolean | null;
  listed?: boolean | null;
  item_detail_id?: number | null;
  /** Marketplace listing-item id — the `listingItemId` in `sm_marketplace_purchase`. */
  market_id?: string | number | null;
  /** Marketplace listing id (the `listingId` of the listing-items API). */
  market_listing_id?: string | number | null;
  market_listing_status_id?: number | null;
  market_updated_date?: string | null;
  /** USD price as a string, e.g. `"10.5"`. */
  listing_price?: string | number | null;
  rarity_sort_value?: number | null;
}

/** One row of `/land/deeds/owned/{player}`: a region the player owns plots in. */
export interface LandOwnedRegionRaw {
  /** Region uid, e.g. `"PR-CEF-81"` — matches `region_uid` on market deeds. */
  uid: string;
  count: number;
}

export interface LandOwnedRegion {
  regionUid: string;
  count: number;
}

export const LAND_RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;
export type LandRarity = (typeof LAND_RARITIES)[number];

/**
 * Land type as shown in the Land Type column/filter. Derived from `plot_status`
 * plus the `castle` / `keep` fields: the API reports both castles and keeps as
 * `plot_status: "kingdom"`, the specific building is carried by `castle` / `keep`.
 */
export const LAND_TYPES = ["natural", "magical", "occupied", "castle", "keep"] as const;
export type LandType = (typeof LAND_TYPES)[number];

export const LAND_TERRAINS = [
  "badlands",
  "bog",
  "caldera",
  "canyon",
  "desert",
  "forest",
  "hills",
  "jungle",
  "lake",
  "mountain",
  "plains",
  "river",
  "swamp",
  "tundra",
] as const;
export type LandTerrain = (typeof LAND_TERRAINS)[number];

/** Natural resources a plot can produce (`land_stats.resources`). The API calls iron `"ore"`. */
export const LAND_RESOURCES = ["grain", "wood", "stone", "iron"] as const;
export type LandResource = (typeof LAND_RESOURCES)[number];

export type TriState = boolean | null;

export interface LandDeedDetails {
  buildingInBox: boolean;
  unstableTotem: boolean;
}

/** Normalized market listing shared by table, grid, filters, sorting and cart. */
export interface LandMarketListing {
  deedUid: string;
  /** `market_id` — the listing-item id to purchase. */
  listingItemId: number;
  /** `market_listing_id`. */
  listingId: number;
  /** `item_detail_id` — the DEEDS marketplace detail id (one per terrain). */
  detailId: number;

  regionId: number;
  regionNumber: number;
  regionUid: string;
  regionName: string;
  tractNumber: number;
  plotNumber: number;
  territory: string;
  /** `region_uid-ttt-ppp`, e.g. `PR-PNW-1-001-001`. */
  location: string;

  surveyed: boolean;
  /** Terrain key (lowercase), `null` for unsurveyed deeds. */
  terrain: LandTerrain | null;
  /** Terrain as reported by the API, e.g. `"Tundra"` / `"Unsurveyed Deed"`. */
  deedType: string;
  rarity: LandRarity | null;
  raritySort: number;
  landType: LandType | null;
  /** Magic element for magical plots (`fire`, `water`, …), else `null`. */
  magicType: string | null;
  resources: LandResource[];
  /** Built worksite as its API `worksite_type` (e.g. `"Grain Farm"`, `"KEEP"`), `null` when undeveloped. */
  worksite: string | null;
  developed: boolean;
  details: LandDeedDetails;

  seller: string;
  listedAt: string | null;
  priceUsd: number;
  imageUrl: string;
}

export interface LandMarketData {
  listings: LandMarketListing[];
  /** ISO timestamp of when the server fetched this from SPL. */
  fetchedAt: string;
}

export type LandMarketSortField = "location" | "price" | "since" | "rarity";
export type SortDirection = "asc" | "desc";

export interface LandMarketSort {
  field: LandMarketSortField;
  direction: SortDirection;
}

export interface LandMarketFilter {
  region: number | null;
  tract: number | null;
  plot: number | null;
  surveyed: TriState;
  rarities: LandRarity[];
  landType: LandType | null;
  terrains: LandTerrain[];
  resources: LandResource[];
  worksites: string[];
  buildingInBox: TriState;
  unstableTotem: TriState;
  developed: TriState;
}
