import type { FilterDrawerConfig, UnifiedCardFilter } from "@/types/card-filter";

/**
 * Counts how many filter *sections* are currently narrowing the data, so the
 * filter toggle can be badged while the panel is closed.
 *
 * Counted per section rather than per field: the edition picker writes four
 * arrays (editions + promo/reward/extra tiers) and the mana cap writes two
 * numbers, but each is one choice the user made in one part of the UI. Counting
 * raw keys would badge the collection page's default "Modern" preset as 4.
 *
 * Deliberately not counted:
 * - `account` — the scope the page is reporting on, auto-selected on load, so it
 *   would badge every page permanently without ever narrowing anything.
 * - `sortBy` / `groupLevels` / `groupFoils` / `topCount` — presentation choices;
 *   they reorder or re-group the data, they do not remove any of it.
 * - `cardName` — always written together with `selectedCardDetailId`, which is
 *   the field that actually filters.
 * - `filterOpen` — UI state.
 * - `rulesets` — no UI in the drawer, so a user could never explain the badge.
 */
type FilterGroup = {
  /** Config flag guarding the section; the group is ignored when it is off. */
  section: keyof FilterDrawerConfig;
  isActive: (filter: UnifiedCardFilter) => boolean;
};

const FILTER_GROUPS: readonly FilterGroup[] = [
  {
    section: "showEditions",
    isActive: (f) =>
      f.editions.length > 0 ||
      f.promoTiers.length > 0 ||
      f.rewardTiers.length > 0 ||
      f.extraTiers.length > 0,
  },
  { section: "showRarities", isActive: (f) => f.rarities.length > 0 },
  { section: "showColors", isActive: (f) => f.colors.length > 0 },
  { section: "showCardTypes", isActive: (f) => f.cardTypes.length > 0 },
  { section: "showFoils", isActive: (f) => f.foilCategories.length > 0 },
  { section: "showCardSearch", isActive: (f) => f.selectedCardDetailId > 0 },
  { section: "showHideMissing", isActive: (f) => f.hideMissingCards },
  { section: "showFormats", isActive: (f) => f.formats.length > 0 },
  { section: "showMatchTypes", isActive: (f) => f.matchTypes.length > 0 },
  { section: "showSinceDays", isActive: (f) => f.sinceDays > 0 },
  { section: "showMana", isActive: (f) => f.minManaCap > 0 || f.maxManaCap > 0 },
  // 1 is the floor, i.e. "no minimum" — only a raised bar is a filter.
  { section: "showMinBattleCount", isActive: (f) => f.minBattleCount > 1 },
];

export function countActiveFilters(filter: UnifiedCardFilter, config: FilterDrawerConfig): number {
  return FILTER_GROUPS.filter(({ section, isActive }) => config[section] && isActive(filter))
    .length;
}
