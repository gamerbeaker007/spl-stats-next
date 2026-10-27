/**
 * Land marketplace data handling: normalization of raw `/land/deeds?status=market`
 * rows, plus the filter / sort pipeline shared by the table and grid views.
 * Safe for server and client.
 */
import {
  UNSURVEYED_DEED_TYPE,
  formatLandLocation,
  getLandDeedImageUrl,
  resolveLandWorksite,
  toLandRarity,
  toLandResource,
  toLandTerrain,
  toLandType,
} from "@/lib/shared/land-deed-utils";
import {
  LAND_RARITIES,
  type LandDeedDetails,
  type LandMarketDeedRaw,
  type LandMarketFilter,
  type LandMarketListing,
  type LandMarketSort,
  type LandOwnedRegion,
  type LandOwnedRegionRaw,
  type LandResource,
  type TriState,
} from "@/types/land/landMarket";

/**
 * Freshness windows: the land market's server cache (`getCachedLandMarket`) and
 * the client hooks, which also memoize owned regions (read live in the browser).
 */
export const LAND_MARKET_STALE_SECONDS = 60;
export const LAND_OWNED_STALE_SECONDS = 5 * 60;

/** Namespace deed watches so plot UIDs cannot collide with marketplace detail IDs. */
export function landMarketWatchId(deedUid: string): string {
  return `land-market:${deedUid}`;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a JSON-in-string field (`stats`, `land_stats`). Tolerates null, empty
 * strings, already-parsed objects and malformed JSON — anything that is not a
 * plain object becomes `{}`.
 */
export function parseJsonObject(value: unknown): Record<string, unknown> {
  let parsed: unknown = value;
  if (typeof value === "string") {
    if (!value.trim()) return {};
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseLandResources(landStats: unknown): LandResource[] {
  const resources = parseJsonObject(landStats).resources;
  if (!Array.isArray(resources)) return [];
  const parsed = resources.map(toLandResource).filter((r): r is LandResource => r !== null);
  return Array.from(new Set(parsed));
}

export function parseLandDetails(stats: unknown): LandDeedDetails {
  const parsed = parseJsonObject(stats);
  return {
    buildingInBox: parsed.building_in_box === true,
    unstableTotem: parsed.unstable_totem === true,
  };
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize one raw market deed. Returns `null` for rows that cannot be bought
 * (no listing-item id / no price) so they never reach the cart.
 */
export function normalizeLandMarketDeed(raw: LandMarketDeedRaw): LandMarketListing | null {
  const listingItemId = toNumber(raw.market_id, Number.NaN);
  const priceUsd = toNumber(raw.listing_price, Number.NaN);
  if (!raw.deed_uid || !Number.isInteger(listingItemId) || !(priceUsd > 0)) return null;

  const deedType = toText(raw.deed_type) || UNSURVEYED_DEED_TYPE;
  const terrain = toLandTerrain(deedType);
  const surveyed = deedType.toLowerCase() !== UNSURVEYED_DEED_TYPE.toLowerCase();
  const rarity = toLandRarity(raw.rarity);
  const landType = toLandType({
    plotStatus: raw.plot_status,
    castle: raw.castle,
    keep: raw.keep,
    worksiteType: raw.worksite_type,
  });
  const magicType = landType === "magical" ? toText(raw.magic_type).toLowerCase() || null : null;
  const regionUid = toText(raw.region_uid);
  const tractNumber = toNumber(raw.tract_number);
  const plotNumber = toNumber(raw.plot_number);
  const worksiteType = toText(raw.worksite_type);

  return {
    deedUid: raw.deed_uid,
    listingItemId,
    listingId: toNumber(raw.market_listing_id),
    detailId: toNumber(raw.item_detail_id),

    regionId: toNumber(raw.region_id),
    regionNumber: toNumber(raw.region_number),
    regionUid,
    regionName: toText(raw.region_name),
    tractNumber,
    plotNumber,
    territory: toText(raw.territory),
    location: formatLandLocation(regionUid, tractNumber, plotNumber),

    surveyed,
    terrain,
    deedType,
    rarity,
    raritySort: rarity ? LAND_RARITIES.indexOf(rarity) + 1 : 0,
    landType,
    magicType,
    resources: parseLandResources(raw.land_stats),
    worksite: resolveLandWorksite({
      worksiteType,
      resourceSymbol: raw.resource_symbol,
      landType,
    }),
    // Reference definition (splinter-lands-next `filters.ts`): a worksite is built.
    developed: worksiteType !== "",
    details: parseLandDetails(raw.stats),

    seller: toText(raw.player),
    listedAt: toText(raw.market_updated_date) || null,
    priceUsd,
    imageUrl: getLandDeedImageUrl({ terrain, landType, rarity, magicType }),
  };
}

export function normalizeLandMarketDeeds(rows: LandMarketDeedRaw[]): LandMarketListing[] {
  const listings: LandMarketListing[] = [];
  for (const row of rows) {
    const listing = normalizeLandMarketDeed(row);
    if (listing) listings.push(listing);
  }
  return listings;
}

export function normalizeOwnedRegions(rows: LandOwnedRegionRaw[]): LandOwnedRegion[] {
  return rows
    .filter((row) => typeof row?.uid === "string" && row.uid.trim() !== "")
    .map((row) => ({ regionUid: row.uid.trim(), count: toNumber(row.count) }));
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export const DEFAULT_LAND_MARKET_FILTER: LandMarketFilter = {
  region: null,
  tract: null,
  plot: null,
  surveyed: null,
  rarities: [],
  landType: null,
  terrains: [],
  resources: [],
  worksites: [],
  buildingInBox: null,
  unstableTotem: null,
  developed: null,
};

export const LAND_LOCATION_MAX = 999;

/**
 * Parse a location filter input: digits only, 1–999, empty → `null`.
 * Returns `undefined` when the input is invalid and should be rejected.
 */
export function parseLocationInput(value: string): number | null | undefined {
  if (value === "") return null;
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1 || parsed > LAND_LOCATION_MAX) return undefined;
  return parsed;
}

function matchesTriState(state: TriState, value: boolean): boolean {
  return state === null || state === value;
}

/** Categories combine with AND; values inside a multi-select category with OR. */
export function matchesLandMarketFilter(
  listing: LandMarketListing,
  filter: LandMarketFilter
): boolean {
  if (filter.region !== null && listing.regionNumber !== filter.region) return false;
  if (filter.tract !== null && listing.tractNumber !== filter.tract) return false;
  if (filter.plot !== null && listing.plotNumber !== filter.plot) return false;
  if (!matchesTriState(filter.surveyed, listing.surveyed)) return false;
  if (filter.rarities.length > 0 && (!listing.rarity || !filter.rarities.includes(listing.rarity)))
    return false;
  if (filter.landType !== null && listing.landType !== filter.landType) return false;
  if (
    filter.terrains.length > 0 &&
    (!listing.terrain || !filter.terrains.includes(listing.terrain))
  )
    return false;
  if (
    filter.resources.length > 0 &&
    !listing.resources.some((resource) => filter.resources.includes(resource))
  )
    return false;
  if (
    filter.worksites.length > 0 &&
    (!listing.worksite || !filter.worksites.includes(listing.worksite))
  )
    return false;
  if (!matchesTriState(filter.buildingInBox, listing.details.buildingInBox)) return false;
  if (!matchesTriState(filter.unstableTotem, listing.details.unstableTotem)) return false;
  if (!matchesTriState(filter.developed, listing.developed)) return false;
  return true;
}

export function countActiveLandMarketFilters(filter: LandMarketFilter): number {
  return [
    filter.region !== null,
    filter.tract !== null,
    filter.plot !== null,
    filter.surveyed !== null,
    filter.rarities.length > 0,
    filter.landType !== null,
    filter.terrains.length > 0,
    filter.resources.length > 0,
    filter.worksites.length > 0,
    filter.buildingInBox !== null,
    filter.unstableTotem !== null,
    filter.developed !== null,
  ].filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Region → tract → plot numerically, then deed UID as the final tie-breaker. */
function compareLocation(a: LandMarketListing, b: LandMarketListing): number {
  return (
    a.regionNumber - b.regionNumber ||
    a.tractNumber - b.tractNumber ||
    a.plotNumber - b.plotNumber ||
    a.regionUid.localeCompare(b.regionUid) ||
    a.deedUid.localeCompare(b.deedUid)
  );
}

function listedTime(listing: LandMarketListing): number {
  const time = listing.listedAt ? Date.parse(listing.listedAt) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

const COMPARATORS: Record<
  LandMarketSort["field"],
  (a: LandMarketListing, b: LandMarketListing) => number
> = {
  location: compareLocation,
  price: (a, b) => a.priceUsd - b.priceUsd,
  // "Since" ascending = most recently listed first (smallest elapsed time).
  since: (a, b) => listedTime(b) - listedTime(a),
  rarity: (a, b) => a.raritySort - b.raritySort,
};

/** Returns a new sorted array. Ties fall back to location, then price, for a stable order. */
export function sortLandMarketListings(
  listings: LandMarketListing[],
  sort: LandMarketSort
): LandMarketListing[] {
  const primary = COMPARATORS[sort.field];
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...listings].sort(
    (a, b) => primary(a, b) * direction || compareLocation(a, b) || COMPARATORS.price(a, b)
  );
}
