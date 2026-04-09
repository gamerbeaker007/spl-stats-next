/**
 * Single source of truth for all edition/set definitions.
 *
 * Design:
 *   - `EDITION_DEFS`    — one row per edition ID; cross-era editions (promo=2, reward=3, extra=17)
 *     have `setName: undefined` — their set is determined by the card's `tier` at runtime.
 *   - `SET_DEFS`        — one row per playable set (alpha, beta, untamed, …);
 *     each set knows its era tier and whether it has cross-era promo/reward/extra cards.
 *   - Derived exports   — `EDITION_OPTIONS`, `EDITION_SET_GROUPS`,
 *     `cardSetIconMap` — keep existing consumers working without changes.
 *   - Helper functions  — `getEditionId`, `getTier`, `getSetName`, etc.
 */
import {
  edition_alpha_icon_url,
  edition_beta_icon_url,
  edition_promo_icon_url,
  edition_reward_icon_url,
  edition_untamed_icon_url,
  edition_dice_icon_url,
  edition_gladius_icon_url,
  edition_chaos_icon_url,
  edition_rift_icon_url,
  edition_soulkeep_icon_url,
  edition_soulbound_icon_url,
  edition_rebellion_icon_url,
  edition_soulbound_rebellion_icon_url,
  edition_conclave_arcana_icon_url,
  edition_foundation_icon_url,
  edition_conclave_extra_icon_url,
  edition_conclave_rewards_icon_url,
  edition_eternal_icon_url,
  edition_land_card_icon_url,
  edition_escalation_icon_url,
} from "@/lib/staticsIconUrls";

// ---------------------------------------------------------------------------
// Canonical edition definitions
// ---------------------------------------------------------------------------

/** Public shape for a single edition definition. */
export interface EditionDef {
  /** Edition number ID used in SPL API and DB. */
  readonly id: number;
  /** Display label, e.g. "Rift Watchers". */
  readonly label: string;
  /** URL path fragment for image building, e.g. "rift". */
  readonly urlName: string;
  /**
   * Set this edition belongs to (e.g. "chaos"), or `undefined` for cross-era editions
   * (promo=2, reward=3, extras=17) — their set is determined by the card's `tier` at runtime.
   * Cross-era editions appear in `EDITION_OPTIONS` but are excluded from
   * `EditionSetGroup.editions`; the set's `hasPromo`/`hasReward`/`hasExtra` flags handle them.
   */
  readonly setName: string | undefined;
  /** Filter / display icon URL. */
  readonly iconUrl: string;
}

// Ordered by edition ID. Add new editions here only.
export const EDITION_DEFS: readonly EditionDef[] = [
  { id: 0, label: "Alpha", urlName: "alpha", setName: "alpha", iconUrl: edition_alpha_icon_url },
  { id: 1, label: "Beta", urlName: "beta", setName: "beta", iconUrl: edition_beta_icon_url },
  {
    id: 2,
    label: "Promo",
    urlName: "promo",
    setName: undefined,
    iconUrl: edition_promo_icon_url,
  },
  {
    id: 3,
    label: "Reward",
    urlName: "reward",
    setName: undefined,
    iconUrl: edition_reward_icon_url,
  },
  {
    id: 4,
    label: "Untamed",
    urlName: "untamed",
    setName: "untamed",
    iconUrl: edition_untamed_icon_url,
  },
  { id: 5, label: "Dice", urlName: "dice", setName: "untamed", iconUrl: edition_dice_icon_url },
  {
    id: 6,
    label: "Gladius",
    urlName: "gladius",
    setName: "eternal",
    iconUrl: edition_gladius_icon_url,
  },
  {
    id: 7,
    label: "Chaos Legion",
    urlName: "chaos",
    setName: "chaos",
    iconUrl: edition_chaos_icon_url,
  },
  {
    id: 8,
    label: "Rift Watchers",
    urlName: "rift",
    setName: "chaos",
    iconUrl: edition_rift_icon_url,
  },
  {
    id: 9,
    label: "Soulkeep",
    urlName: "soulkeep",
    setName: "soulkeep",
    iconUrl: edition_soulkeep_icon_url,
  },
  {
    id: 10,
    label: "Soulbound",
    urlName: "soulbound",
    setName: "chaos",
    iconUrl: edition_soulbound_icon_url,
  },
  {
    id: 11,
    label: "Soulkeep ?",
    urlName: "soulkeep",
    setName: "soulkeep",
    iconUrl: edition_soulkeep_icon_url,
  },
  {
    id: 12,
    label: "Rebellion",
    urlName: "rebellion",
    setName: "rebellion",
    iconUrl: edition_rebellion_icon_url,
  },
  {
    id: 13,
    label: "Soulbound Reb.",
    urlName: "soulboundrb",
    setName: "rebellion",
    iconUrl: edition_soulbound_rebellion_icon_url,
  },
  {
    id: 14,
    label: "Conclave Arcana",
    urlName: "conclave",
    setName: "conclave",
    iconUrl: edition_conclave_arcana_icon_url,
  },
  {
    id: 15,
    label: "Foundation",
    urlName: "foundations",
    setName: "foundation",
    iconUrl: edition_foundation_icon_url,
  },
  {
    id: 16,
    label: "Soulbound Foundation",
    urlName: "foundations",
    setName: "foundation",
    iconUrl: edition_foundation_icon_url,
  },
  {
    id: 17,
    label: "Extras",
    urlName: "extra",
    setName: undefined,
    iconUrl: edition_conclave_extra_icon_url,
  },
  {
    id: 18,
    label: "Conclave Rewards",
    urlName: "reward",
    setName: "conclave",
    iconUrl: edition_conclave_rewards_icon_url,
  },
  {
    id: 19,
    label: "Eternal",
    urlName: "land",
    setName: "eternal",
    iconUrl: edition_land_card_icon_url,
  },
  {
    id: 20,
    label: "Escalation",
    urlName: "escalation",
    setName: "conclave",
    iconUrl: edition_escalation_icon_url,
  },
];

// ---------------------------------------------------------------------------
// Canonical set definitions
// ---------------------------------------------------------------------------

/** Public shape for a single set / era definition. */
export interface SetDef {
  readonly setName: string;
  readonly label: string;
  /**
   * Era tier — the numeric value stored on promo (edition=2), reward (edition=3),
   * and extra (edition=17) cards to identify which set they belong to.
   * `null` = this set has no cross-era cards.
   */
  readonly tier: number | null;
  readonly iconUrl: string;
  /** Whether this set has era-promo cards (edition=2 with this tier). */
  readonly hasPromo: boolean;
  /** Whether this set has era-reward cards (edition=3 with this tier). */
  readonly hasReward: boolean;
  /** Whether this set has extra cards (edition=17 with this tier). */
  readonly hasExtra: boolean;
}

// Ordered by era (ascending tier). Add new sets here only.
export const SET_DEFS: readonly SetDef[] = [
  {
    setName: "alpha",
    label: "Alpha",
    tier: 0,
    iconUrl: edition_alpha_icon_url,
    hasPromo: true,
    hasReward: false,
    hasExtra: false,
  },
  {
    setName: "beta",
    label: "Beta",
    tier: 1,
    iconUrl: edition_beta_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "untamed",
    label: "Untamed",
    tier: 4,
    iconUrl: edition_untamed_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "chaos",
    label: "Chaos",
    tier: 7,
    iconUrl: edition_chaos_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "rebellion",
    label: "Rebellion",
    tier: 12,
    iconUrl: edition_rebellion_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "conclave",
    label: "Conclave",
    tier: 14,
    iconUrl: edition_conclave_arcana_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: true,
  },
  {
    setName: "foundation",
    label: "Foundation",
    tier: 15,
    iconUrl: edition_foundation_icon_url,
    hasPromo: false,
    hasReward: false,
    hasExtra: true,
  },
  {
    setName: "eternal",
    label: "Eternal",
    tier: null,
    iconUrl: edition_eternal_icon_url,
    hasPromo: false,
    hasReward: false,
    hasExtra: false,
  },
];

// ---------------------------------------------------------------------------
// Canonical set name list and type
// ---------------------------------------------------------------------------

/** Ordered set names — replaces `cardSetOptions` in types/card.ts. */
export const SET_NAMES = [
  "alpha",
  "beta",
  "untamed",
  "chaos",
  "rebellion",
  "conclave",
  "foundation",
  "eternal",
] as const;

/** Union of all set name string literals. Replaces `CardSetName` in types/card.ts. */
export type SetName = (typeof SET_NAMES)[number];

// ---------------------------------------------------------------------------
// O(1) lookup maps (internal)
// ---------------------------------------------------------------------------

const _editionById = new Map<number, EditionDef>(EDITION_DEFS.map((e) => [e.id, e]));
const _setByName = new Map<string, SetDef>(SET_DEFS.map((s) => [s.setName, s]));

// ---------------------------------------------------------------------------
// Derived exports — keep existing consumers working
// ---------------------------------------------------------------------------

/**
 * Single edition option for flat filter UIs.
 * Replaces the hand-written array in src/types/battles/index.ts.
 */
export interface EditionOption {
  value: number;
  label: string;
  iconUrl: string;
}

/** All editions as filter options (including cross-era editions 2, 3, 17). */
export const EDITION_OPTIONS: EditionOption[] = EDITION_DEFS.map((e) => ({
  value: e.id,
  label: e.label,
  iconUrl: e.iconUrl,
}));

/**
 * Grouped set/edition options for the hierarchical filter UI.
 * Replaces the hand-written array in src/types/battles/index.ts.
 */
export interface EditionSetGroup {
  setName: string;
  label: string;
  iconUrl: string;
  /**
   * Native edition IDs belonging to this set.
   * Cross-era types (edition=2 promo, =3 reward, =17 extra) are excluded here —
   * they are controlled via `hasPromo` / `hasReward` / `hasExtra` instead.
   */
  editions: number[];
  /** Era tier for cross-era cards of this set; `null` = no cross-era cards. */
  tier: number | null;
  hasPromo: boolean;
  hasReward: boolean;
  hasExtra: boolean;
}

export const EDITION_SET_GROUPS: EditionSetGroup[] = SET_DEFS.map((s) => ({
  setName: s.setName,
  label: s.label,
  iconUrl: s.iconUrl,
  tier: s.tier,
  hasPromo: s.hasPromo,
  hasReward: s.hasReward,
  hasExtra: s.hasExtra,
  editions: EDITION_DEFS.filter((e) => e.setName === s.setName).map((e) => e.id),
}));

/**
 * Set name → icon URL map.
 * Replaces `cardSetIconMap` in src/types/card.ts.
 */
export const cardSetIconMap: Record<SetName, string> = Object.fromEntries(
  SET_DEFS.map((s) => [s.setName, s.iconUrl])
) as Record<SetName, string>;

// ---------------------------------------------------------------------------
// Helper functions — prefer these over accessing editionMap/editionDef directly
// ---------------------------------------------------------------------------

/** Display label for an edition ID, e.g. `getEditionLabel(8)` → `"Rift Watchers"`. */
export function getEditionLabel(editionId: number): string | undefined {
  return _editionById.get(editionId)?.label;
}

/** URL name fragment for an edition ID, e.g. `getEditionUrlName(8)` → `"rift"`. */
export function getEditionUrlName(editionId: number): string | undefined {
  return _editionById.get(editionId)?.urlName;
}

/** Icon URL for an edition ID, e.g. `getEditionIconUrl(8)` → `"…icon-edition-rift.svg"`. */
export function getEditionIconUrl(editionId: number): string | undefined {
  return _editionById.get(editionId)?.iconUrl;
}

/**
 * Set name for an edition, e.g. `getSetName(8)` → `"chaos"`.
 * Returns `undefined` for cross-era editions (promo=2, reward=3, extras=17) — their set
 * is determined by the `tier` field on the card at runtime.
 */
export function getSetName(editionId: number): string | undefined {
  return _editionById.get(editionId)?.setName;
}

/**
 * Edition ID by display label (case-insensitive), e.g. `getEditionId("Rift Watchers")` → `8`.
 * Returns `undefined` if not found.
 */
export function getEditionId(label: string): number | undefined {
  const lower = label.toLowerCase();
  return EDITION_DEFS.find((e) => e.label.toLowerCase() === lower)?.id;
}

/**
 * Edition ID by URL name, e.g. `getEditionIdByUrlName("rift")` → `8`.
 * Returns the lowest-ID match when multiple editions share a URL name.
 */
export function getEditionIdByUrlName(urlName: string): number | undefined {
  const lower = urlName.toLowerCase();
  return EDITION_DEFS.find((e) => e.urlName.toLowerCase() === lower)?.id;
}

/**
 * Era tier for a set, e.g. `getTier("chaos")` → `7`.
 * Returns `null` for eternal (no cross-era cards), `undefined` if the set name is unknown.
 */
export function getTier(setName: string): number | null | undefined {
  return _setByName.get(setName)?.tier;
}

/**
 * Full set metadata for an edition, e.g. `getSetForEdition(8)` → Chaos `SetDef`.
 * Returns `undefined` for cross-era editions with no fixed set.
 */
export function getSetForEdition(editionId: number): SetDef | undefined {
  const sn = _editionById.get(editionId)?.setName;
  return sn !== undefined ? _setByName.get(sn) : undefined;
}

/** Icon URL for a set name, e.g. `getSetIconUrl("chaos")` → `"…icon-edition-chaos.svg"`. */
export function getSetIconUrl(setName: string): string | undefined {
  return _setByName.get(setName)?.iconUrl;
}
