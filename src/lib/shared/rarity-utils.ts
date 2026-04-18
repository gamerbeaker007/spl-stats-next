/**
 * Single source of truth for all rarity definitions.
 *
 * Design:
 *   - `RARITY_DEFS`   — one row per rarity; ordered Common → Legendary.
 *     Carries `id` (SPL API numeric rarity), `name` (lowercase type value),
 *     `label` (capitalized display / DB `rarityName`), `color` (chart hex), `iconUrl`.
 *   - Derived exports — `RARITY_NAMES`, `CardRarity`, `cardRarityOptions`,
 *     `cardRarityIconMap`, `RARITY_ORDER`, `RARITY_COLORS` — replace all inline copies.
 */
import {
  card_rarity_common_icon_url,
  card_rarity_epic_icon_url,
  card_rarity_legendary_icon_url,
  card_rarity_rare_icon_url,
} from "@/lib/staticsIconUrls";

export interface RarityDef {
  /** Numeric rarity ID used in SPL API (1=Common … 4=Legendary). */
  readonly id: number;
  /** Lowercase value used as the TypeScript `CardRarity` type and in filter state. */
  readonly name: string;
  /** Capitalized display label — matches the `rarityName` string returned by the DB. */
  readonly label: string;
  /** Hex color used in charts and highlighted UI elements. */
  readonly color: string;
  /** Icon URL. */
  readonly iconUrl: string;
}

// Ordered Common → Legendary. Add new rarities here only.
export const RARITY_DEFS: readonly RarityDef[] = [
  {
    id: 1,
    name: "common",
    label: "Common",
    color: "#9e9e9e",
    iconUrl: card_rarity_common_icon_url,
  },
  { id: 2, name: "rare", label: "Rare", color: "#2196F3", iconUrl: card_rarity_rare_icon_url },
  { id: 3, name: "epic", label: "Epic", color: "#9C27B0", iconUrl: card_rarity_epic_icon_url },
  {
    id: 4,
    name: "legendary",
    label: "Legendary",
    color: "#FF9800",
    iconUrl: card_rarity_legendary_icon_url,
  },
];

// ---------------------------------------------------------------------------
// Derived types and constants
// ---------------------------------------------------------------------------

/** Ordered tuple of lowercase rarity names. */
export const RARITY_NAMES = RARITY_DEFS.map((r) => r.name) as [
  "common",
  "rare",
  "epic",
  "legendary",
];

/** Union type for rarity values, e.g. `"common" | "rare" | "epic" | "legendary"`. */
export type CardRarity = (typeof RARITY_NAMES)[number];

/** Mutable array of rarity values — satisfies components that expect a mutable array. */
export const cardRarityOptions: CardRarity[] = [...RARITY_NAMES];

/** Lowercase rarity name → icon URL map (used in filter UIs). */
export const cardRarityIconMap: Record<CardRarity, string> = Object.fromEntries(
  RARITY_DEFS.map((r) => [r.name, r.iconUrl])
) as Record<CardRarity, string>;

/**
 * Ordered array of capitalized rarity labels for chart axes and table headers.
 * Matches the `rarityName` values returned by the DB.
 */
export const RARITY_ORDER: string[] = RARITY_DEFS.map((r) => r.label);

/** Capitalized label → hex color map for chart markers. */
export const RARITY_COLORS: Record<string, string> = Object.fromEntries(
  RARITY_DEFS.map((r) => [r.label, r.color])
);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Display label for a rarity name, e.g. `getRarityLabel("epic")` → `"Epic"`. */
export function getRarityLabel(name: string): string | undefined {
  return RARITY_DEFS.find((r) => r.name === name)?.label;
}

/** Hex color for a capitalized rarity label, e.g. `getRarityColor("Rare")` → `"#2196F3"`. */
export function getRarityColor(label: string): string | undefined {
  return RARITY_DEFS.find((r) => r.label === label)?.color;
}

/** Icon URL for a rarity name or label (case-insensitive). */
export function getRarityIconUrl(nameOrLabel: string): string | undefined {
  const lower = nameOrLabel.toLowerCase();
  return RARITY_DEFS.find((r) => r.name === lower || r.label.toLowerCase() === lower)?.iconUrl;
}

/** Rarity ID for a rarity name, e.g. `getRarityId("legendary")` → `4`. */
export function getRarityId(name: string): number | undefined {
  return RARITY_DEFS.find((r) => r.name === name)?.id;
}

/**
 * Looks up a `RarityDef` by the numeric rarity ID from the SPL API (1=Common … 4=Legendary).
 * Returns `undefined` for unknown IDs rather than silently returning the wrong rarity.
 */
export function getRarityById(apiId: number): RarityDef | undefined {
  return RARITY_DEFS.find((r) => r.id === apiId);
}
