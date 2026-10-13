/**
 * Single source of truth for land deed mappings: artwork, terrain / rarity /
 * land-type / magic / resource / worksite / detail icons, labels and formatting.
 *
 * Mappings mirror the `splinter-lands-next` reference project (`deedUtil.ts`,
 * `statics.ts`, `primitives.ts`) so both apps render deeds identically.
 * Safe for server and client.
 */
import { RARITY_DEFS } from "@/lib/shared/rarity-utils";
import {
  land_building_in_box_icon_url,
  land_castle_icon_url,
  land_deed_surveyed_base_url,
  land_deed_unsurveyed_url,
  land_keep_icon_url,
  land_side_menu_icon_url_placeholder,
  land_under_construction_icon_url,
  land_unstable_totem_icon_url,
  land_unsurveyed_deed_icon_url,
  land_worksite_aura_icon_url,
  land_worksite_grain_icon_url,
  land_worksite_iron_icon_url,
  land_worksite_research_icon_url,
  land_worksite_sps_icon_url,
  land_worksite_stone_icon_url,
  land_worksite_wood_icon_url,
  resource_aura_icon_url,
  resource_grain_icon_url,
  resource_iron_icon_url,
  resource_research_icon_url,
  resource_stone_icon_url,
  resource_wood_icon_url,
  sps_icon_url,
} from "@/lib/staticsIconUrls";
import {
  LAND_RARITIES,
  LAND_RESOURCES,
  LAND_TERRAINS,
  type LandDeedDetails,
  type LandRarity,
  type LandResource,
  type LandTerrain,
  type LandType,
} from "@/types/land/landMarket";

export const UNSURVEYED_DEED_TYPE = "Unsurveyed Deed";

function sideMenuIcon(name: string): string {
  return land_side_menu_icon_url_placeholder.replace("__NAME__", name.toLowerCase());
}

export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
}

// ---------------------------------------------------------------------------
// Parsers (API string → typed key)
// ---------------------------------------------------------------------------

export function toLandTerrain(value: string | null | undefined): LandTerrain | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return (LAND_TERRAINS as readonly string[]).includes(normalized)
    ? (normalized as LandTerrain)
    : null;
}

export function toLandRarity(value: string | null | undefined): LandRarity | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return (LAND_RARITIES as readonly string[]).includes(normalized)
    ? (normalized as LandRarity)
    : null;
}

/** `land_stats.resources` spells iron as `"ore"`. */
const RESOURCE_ALIASES: Record<string, LandResource> = { ore: "iron" };

export function toLandResource(value: unknown): LandResource | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const aliased = RESOURCE_ALIASES[normalized] ?? normalized;
  return (LAND_RESOURCES as readonly string[]).includes(aliased) ? (aliased as LandResource) : null;
}

/**
 * Land type from `plot_status` + `castle`/`keep`. The API reports castles and
 * keeps both as `plot_status: "kingdom"`; the numeric `castle` / `keep` id (or
 * `worksite_type` `CASTLE` / `KEEP`) says which. Unsurveyed deeds (`"Unknown"`) → `null`.
 */
export function toLandType(args: {
  plotStatus: string | null | undefined;
  castle?: number | null;
  keep?: number | null;
  worksiteType?: string | null;
}): LandType | null {
  const status = (args.plotStatus ?? "").trim().toLowerCase();
  if (status === "natural" || status === "magical" || status === "occupied") return status;
  if (status !== "kingdom") return null;

  const worksite = (args.worksiteType ?? "").trim().toUpperCase();
  if ((args.castle ?? 0) > 0 || worksite === "CASTLE") return "castle";
  return "keep";
}

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------

/**
 * Deed artwork URL, following the reference project's `getDeedImg`:
 * - unsurveyed → generic unsurveyed deed
 * - magical    → `{terrain}_magical_{element}_{rarity}.jpg`
 * - castle/keep → `{terrain}_kingdom_{castle|keep}.jpg`
 * - otherwise  → `{terrain}_{natural|occupied}_{rarity}.jpg`
 */
export function getLandDeedImageUrl(args: {
  terrain: LandTerrain | null;
  landType: LandType | null;
  rarity: LandRarity | null;
  magicType?: string | null;
}): string {
  const { terrain, landType, rarity, magicType } = args;
  if (!terrain) return land_deed_unsurveyed_url;

  const rarityKey = rarity ?? "common";
  if (landType === "castle" || landType === "keep") {
    return `${land_deed_surveyed_base_url}/${terrain}_kingdom_${landType}.jpg`;
  }
  if (landType === "magical" && magicType) {
    return `${land_deed_surveyed_base_url}/${terrain}_magical_${magicType.toLowerCase()}_${rarityKey}.jpg`;
  }
  return `${land_deed_surveyed_base_url}/${terrain}_${landType ?? "natural"}_${rarityKey}.jpg`;
}

// ---------------------------------------------------------------------------
// Icons + labels
// ---------------------------------------------------------------------------

export function getLandTerrainIconUrl(terrain: LandTerrain | null): string {
  return terrain ? sideMenuIcon(terrain) : land_unsurveyed_deed_icon_url;
}

export function getLandTerrainLabel(terrain: LandTerrain | null): string {
  return terrain ? capitalize(terrain) : UNSURVEYED_DEED_TYPE;
}

/** The game has no dedicated mythic land icon; the reference project reuses legendary's. */
export function getLandRarityIconUrl(rarity: LandRarity | null): string {
  if (!rarity) return land_under_construction_icon_url;
  return sideMenuIcon(rarity === "mythic" ? "legendary" : rarity);
}

const MYTHIC_COLOR = "#005710";

/** Card rarity colors for common → legendary, plus a distinct mythic red. */
export function getLandRarityColor(rarity: LandRarity | null): string {
  if (rarity === "mythic") return MYTHIC_COLOR;
  return RARITY_DEFS.find((def) => def.name === rarity)?.color ?? "#9e9e9e";
}

export const LAND_TYPE_LABELS: Record<LandType, string> = {
  natural: "Natural",
  magical: "Magical",
  occupied: "Occupied",
  castle: "Castle",
  keep: "Keep",
};

export function getLandTypeIconUrl(landType: LandType | null): string {
  if (landType === "castle") return land_castle_icon_url;
  if (landType === "keep") return land_keep_icon_url;
  if (!landType) return land_unsurveyed_deed_icon_url;
  return sideMenuIcon(landType);
}

/** Magic elements in the game: fire, water, life, death, earth, dragon. */
export function getLandMagicTypeIconUrl(magicType: string): string {
  return sideMenuIcon(magicType);
}

export const LAND_RESOURCE_DEFS: Record<LandResource, { label: string; iconUrl: string }> = {
  grain: { label: "Grain", iconUrl: resource_grain_icon_url },
  wood: { label: "Wood", iconUrl: resource_wood_icon_url },
  stone: { label: "Stone", iconUrl: resource_stone_icon_url },
  iron: { label: "Iron", iconUrl: resource_iron_icon_url },
};

export interface LandWorksiteDef {
  /** API `worksite_type` value — the key used everywhere. */
  type: string;
  label: string;
  /** Token the worksite produces (`resource_symbol`). */
  token: string;
  iconUrl: string;
  resourceIconUrl: string;
}

/** Reference: `resourceWorksiteMap` + `worksiteTypeMapping` in splinter-lands-next. */
export const LAND_WORKSITES: readonly LandWorksiteDef[] = [
  {
    type: "Grain Farm",
    label: "Grain Farm",
    token: "GRAIN",
    iconUrl: land_worksite_grain_icon_url,
    resourceIconUrl: resource_grain_icon_url,
  },
  {
    type: "Logging Camp",
    label: "Logging Camp",
    token: "WOOD",
    iconUrl: land_worksite_wood_icon_url,
    resourceIconUrl: resource_wood_icon_url,
  },
  {
    type: "Ore Mine",
    label: "Ore Mine",
    token: "IRON",
    iconUrl: land_worksite_iron_icon_url,
    resourceIconUrl: resource_iron_icon_url,
  },
  {
    type: "Quarry",
    label: "Quarry",
    token: "STONE",
    iconUrl: land_worksite_stone_icon_url,
    resourceIconUrl: resource_stone_icon_url,
  },
  {
    type: "Research Hut",
    label: "Research Hut",
    token: "RESEARCH",
    iconUrl: land_worksite_research_icon_url,
    resourceIconUrl: resource_research_icon_url,
  },
  {
    type: "Aura Lab",
    label: "Aura Lab",
    token: "AURA",
    iconUrl: land_worksite_aura_icon_url,
    resourceIconUrl: resource_aura_icon_url,
  },
  {
    type: "Shard Mine",
    label: "Shard Mine",
    token: "SPS",
    iconUrl: land_worksite_sps_icon_url,
    resourceIconUrl: sps_icon_url,
  },
  {
    type: "KEEP",
    label: "Keep",
    token: "TAX",
    iconUrl: land_keep_icon_url,
    resourceIconUrl: land_keep_icon_url,
  },
  {
    type: "CASTLE",
    label: "Castle",
    token: "TAX",
    iconUrl: land_castle_icon_url,
    resourceIconUrl: land_castle_icon_url,
  },
];

const WORKSITE_BY_TYPE = new Map(LAND_WORKSITES.map((def) => [def.type.toUpperCase(), def]));

export function getLandWorksiteDef(type: string | null): LandWorksiteDef | null {
  return type ? (WORKSITE_BY_TYPE.get(type.toUpperCase()) ?? null) : null;
}

/**
 * Worksite currently built on the plot. `worksite_type` is the API's own name
 * for the building and wins; `resource_symbol` (the produced token) is only a
 * fallback, and `TAX` resolves through the land type since keeps and castles
 * both produce it.
 */
export function resolveLandWorksite(args: {
  worksiteType: string | null | undefined;
  resourceSymbol: string | null | undefined;
  landType: LandType | null;
}): string | null {
  const byType = getLandWorksiteDef((args.worksiteType ?? "").trim() || null);
  if (byType) return byType.type;

  const token = (args.resourceSymbol ?? "").trim().toUpperCase();
  if (!token) return null;
  if (token === "TAX") return args.landType === "castle" ? "CASTLE" : "KEEP";
  return LAND_WORKSITES.find((def) => def.token === token)?.type ?? null;
}

export const LAND_DETAIL_DEFS: Array<{
  key: keyof LandDeedDetails;
  label: string;
  iconUrl: string;
}> = [
  {
    key: "buildingInBox",
    label: "Building in the Box",
    iconUrl: land_building_in_box_icon_url,
  },
  {
    key: "unstableTotem",
    label: "Unstable Totem",
    iconUrl: land_unstable_totem_icon_url,
  },
];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function pad3(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(3, "0");
}

/** `region_uid-ttt-ppp`, e.g. `PR-PNW-1-001-001`. */
export function formatLandLocation(regionUid: string, tractNumber: number, plotNumber: number) {
  return `${regionUid}-${pad3(tractNumber)}-${pad3(plotNumber)}`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Compact elapsed time: `15m`, `3h`, `2d`, `2mo`. Days up to 30, months beyond.
 * Returns `"-"` for missing / invalid timestamps; future dates clamp to `0m`.
 */
export function formatListingAge(iso: string | null | undefined, now: number = Date.now()) {
  if (!iso) return "-";
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "-";

  const elapsed = Math.max(0, now - time);
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h`;
  const days = Math.floor(elapsed / DAY_MS);
  if (days <= 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** Deed listings are priced in USD on the marketplace (DEC/Credits are conversions). */
export function formatLandPriceUsd(priceUsd: number): string {
  return Number.isFinite(priceUsd) ? USD_FORMAT.format(priceUsd) : "-";
}
