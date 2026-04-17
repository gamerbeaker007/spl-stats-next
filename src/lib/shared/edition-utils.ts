/**
 * Single source of truth for all edition/set definitions.
 *
 * Design:
 *   - `EDITION_DEFS`    — one row per edition ID.
 *     Cross-era editions (promo=2, reward=3, extra=17) have `setName: undefined` — their set is
 *     determined by the card's `tier` field at runtime.
 *     The canonical edition of each set is marked `primary: true`; its `id` equals the SPL API
 *     tier discriminator for cross-era cards of that set (e.g. Chaos Legion id=7 → chaos tier=7).
 *   - `SET_DEFS`        — one row per playable set; `tier` is derived from the primary edition
 *     in `EDITION_DEFS` so it never needs to be hardcoded here.
 *   - Derived exports   — `EDITION_OPTIONS`, `EDITION_SET_GROUPS`,
 *     `cardSetIconMap` — keep existing consumers working without changes.
 *   - Helper functions  — `getEditionId`, `getTier`, `getSetName`, etc.
 */
import {
  edition_alpha_icon_url,
  edition_beta_icon_url,
  edition_chaos_icon_url,
  edition_conclave_arcana_icon_url,
  edition_conclave_extra_icon_url,
  edition_conclave_rewards_icon_url,
  edition_dice_icon_url,
  edition_escalation_icon_url,
  edition_eternal_icon_url,
  edition_foundation_icon_url,
  edition_gladius_icon_url,
  edition_land_card_icon_url,
  edition_promo_icon_url,
  edition_rebellion_icon_url,
  edition_reward_icon_url,
  edition_rift_icon_url,
  edition_soulbound_icon_url,
  edition_soulbound_rebellion_icon_url,
  edition_soulkeep_icon_url,
  edition_untamed_icon_url,
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
  readonly setName: CardSetName | undefined;
  /** Filter / display icon URL. */
  readonly iconUrl: string;
  /** Whether this edition is a soulbound edition. (some can be unlocked) when not defined = false */
  readonly soulbound?: boolean;
  /**
   * Marks this edition as the canonical/primary edition of its set.
   * The SPL API uses this edition's `id` as the `tier` discriminator on cross-era cards
   * (promo=2, reward=3, extra=17) to identify which set they belong to.
   * `SET_DEFS.tier` is derived from this flag — never hardcoded separately.
   */
  readonly primary?: true;
}

// Ordered by edition ID. Add new editions here only.
export const EDITION_DEFS: readonly EditionDef[] = [
  {
    id: 0,
    label: "Alpha",
    urlName: "alpha",
    setName: "alpha",
    iconUrl: edition_alpha_icon_url,
    primary: true,
  },
  {
    id: 1,
    label: "Beta",
    urlName: "beta",
    setName: "beta",
    iconUrl: edition_beta_icon_url,
    primary: true,
  },
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
    primary: true,
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
    primary: true,
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
    primary: true,
  },
  {
    id: 10,
    label: "Soulbound",
    urlName: "soulbound",
    setName: "chaos",
    soulbound: true,
    iconUrl: edition_soulbound_icon_url,
  },
  {
    id: 11,
    label: "Soulkeep Promo",
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
    primary: true,
  },
  {
    id: 13,
    label: "Soulbound Reb.",
    urlName: "soulboundrb",
    setName: "rebellion",
    soulbound: true,
    iconUrl: edition_soulbound_rebellion_icon_url,
  },
  {
    id: 14,
    label: "Conclave Arcana",
    urlName: "conclave",
    setName: "conclave",
    iconUrl: edition_conclave_arcana_icon_url,
    primary: true,
  },
  {
    id: 15,
    label: "Foundation",
    urlName: "foundations",
    setName: "foundation",
    iconUrl: edition_foundation_icon_url,
    primary: true,
  },
  {
    id: 16,
    label: "Soulbound Foundation",
    urlName: "foundations",
    setName: "foundation",
    soulbound: true,
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
    soulbound: true,
    iconUrl: edition_conclave_rewards_icon_url,
  },
  {
    id: 19,
    label: "Land",
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
   * Era tier — the numeric value stored on cross-era cards (promo=2, reward=3, extra=17)
   * to identify which set they belong to. Equals the `id` of the primary edition
   * (the one marked `primary: true` in `EDITION_DEFS`).
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

/**
 * Source data for sets — only the fields that cannot be derived from `EDITION_DEFS`.
 * `tier` is intentionally absent here; it is derived by looking up the primary edition
 * (`primary: true`) for each set, so it never needs to be hardcoded.
 * `label` and `iconUrl` stay because some sets differ from their primary edition's values
 * (e.g. "Chaos" vs "Chaos Legion"; "Eternal" has no standalone edition entry).
 *
 * Ordered by era (ascending tier). Add new sets here only.
 */
type SetDefInput = Omit<SetDef, "tier">;
const _SET_DEF_INPUTS: readonly SetDefInput[] = [
  {
    setName: "alpha",
    label: "Alpha",
    iconUrl: edition_alpha_icon_url,
    hasPromo: true,
    hasReward: false,
    hasExtra: false,
  },
  {
    setName: "beta",
    label: "Beta",
    iconUrl: edition_beta_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "untamed",
    label: "Untamed",
    iconUrl: edition_untamed_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "chaos",
    label: "Chaos",
    iconUrl: edition_chaos_icon_url,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "soulkeep",
    label: "Soulkeep",
    iconUrl: edition_soulkeep_icon_url,
    hasPromo: false,
    hasReward: false,
    hasExtra: false,
  },
  {
    setName: "rebellion",
    label: "Rebellion",
    iconUrl: edition_rebellion_icon_url,
    hasPromo: true,
    hasReward: false,
    hasExtra: false,
  },
  {
    setName: "conclave",
    label: "Conclave",
    iconUrl: edition_conclave_arcana_icon_url,
    hasPromo: true,
    hasReward: false,
    hasExtra: true,
  },
  {
    setName: "foundation",
    label: "Foundation",
    iconUrl: edition_foundation_icon_url,
    hasPromo: false,
    hasReward: false,
    hasExtra: true,
  },
  {
    setName: "eternal",
    label: "Eternal",
    iconUrl: edition_eternal_icon_url,
    hasPromo: false,
    hasReward: false,
    hasExtra: false,
  },
];

/** Fully resolved set definitions — `tier` is derived from the primary edition in `EDITION_DEFS`. */
export const SET_DEFS: readonly SetDef[] = _SET_DEF_INPUTS.map((s) => ({
  ...s,
  tier: EDITION_DEFS.find((e) => e.setName === s.setName && e.primary)?.id ?? null,
}));

// ---------------------------------------------------------------------------
// Canonical set name list and type
// ---------------------------------------------------------------------------

/** Ordered set names — replaces `cardSetOptions` in types/card.ts. */
export const SET_NAMES = [
  "alpha",
  "beta",
  "untamed",
  "chaos",
  "soulkeep",
  "rebellion",
  "conclave",
  "foundation",
  "eternal",
] as const;

/** Union of all set name string literals. Replaces `CardSetName` in types/card.ts. */
export type CardSetName = (typeof SET_NAMES)[number];

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
export const cardSetIconMap: Record<CardSetName, string> = Object.fromEntries(
  SET_DEFS.map((s) => [s.setName, s.iconUrl])
) as Record<CardSetName, string>;

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
export function getSetName(editionId: number): CardSetName | undefined {
  return _editionById.get(editionId)?.setName as CardSetName | undefined;
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

/** Whether an edition is a soulbound edition. */
export function isSoulbound(editionId: number): boolean {
  return _editionById.get(editionId)?.soulbound ?? false;
}
