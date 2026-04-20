import type { UnifiedCardFilter } from "@/types/card-filter";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type { CardDistributionRow } from "@/types/card-stats";
import { EDITION_OPTIONS, EDITION_SET_GROUPS } from "@/lib/shared/edition-utils";
import { RARITY_DEFS } from "@/lib/shared/rarity-utils";

// ---------------------------------------------------------------------------
// Modern edition preset
// Mirrors the "Modern" quick-select logic in EditionSetFilter.tsx.
// ---------------------------------------------------------------------------

const MODERN_SET_NAMES = ["rebellion", "conclave", "foundation"] as const;

export function getModernEditionPreset(): Pick<
  UnifiedCardFilter,
  "editions" | "promoTiers" | "rewardTiers" | "extraTiers"
> {
  const groups = EDITION_SET_GROUPS.filter((g) =>
    (MODERN_SET_NAMES as readonly string[]).includes(g.setName)
  );
  const validIds = (group: (typeof groups)[number]) =>
    group.editions.filter((id) => EDITION_OPTIONS.some((e) => e.value === id));

  return {
    editions: groups.flatMap((g) => validIds(g)),
    promoTiers: groups.filter((g) => g.hasPromo && g.tier !== null).map((g) => g.tier!),
    rewardTiers: groups.filter((g) => g.hasReward && g.tier !== null).map((g) => g.tier!),
    extraTiers: groups.filter((g) => g.hasExtra && g.tier !== null).map((g) => g.tier!),
  };
}

// ---------------------------------------------------------------------------
// localStorage cleanup (call on logout to reset all persisted filter state)
// ---------------------------------------------------------------------------

export function clearAllFilterStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("card-filter");
    localStorage.removeItem("card-stats-filter");
    localStorage.removeItem("battle-filter");
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Shared edition match logic
// Mirrors the DB-side `editionConds` OR logic in lib/backend/db/battle-cards.ts.
// ---------------------------------------------------------------------------

function hasEditionFilter(
  filter: Pick<UnifiedCardFilter, "editions" | "promoTiers" | "rewardTiers" | "extraTiers">
): boolean {
  return (
    filter.editions.length > 0 ||
    filter.promoTiers.length > 0 ||
    filter.rewardTiers.length > 0 ||
    filter.extraTiers.length > 0
  );
}

function matchesEditionFilter(
  edition: number,
  tier: number | null,
  filter: Pick<UnifiedCardFilter, "editions" | "promoTiers" | "rewardTiers" | "extraTiers">
): boolean {
  if (!hasEditionFilter(filter)) return true;
  if (edition === 2) return tier !== null && filter.promoTiers.includes(tier);
  if (edition === 3) return tier !== null && filter.rewardTiers.includes(tier);
  if (edition === 17) return tier !== null && filter.extraTiers.includes(tier);
  return filter.editions.includes(edition);
}

// ---------------------------------------------------------------------------
// Client-side predicate for DetailedPlayerCardCollectionItem (multi-dashboard)
//
// Value format differences from the collection API vs filter state:
//   rarity  — CardRarity ("common") → number (1) via RARITY_DEFS
//   color   — CardElement ("red")   → string ("Red") via capitalize
//   role    — CardRole ("archon")   → string ("Summoner") via mapping
// ---------------------------------------------------------------------------

export function matchesCardFilter(
  card: DetailedPlayerCardCollectionItem,
  filter: UnifiedCardFilter
): boolean {
  if (!matchesEditionFilter(card.edition, card.tier ?? null, filter)) return false;

  if (filter.rarities.length > 0) {
    const rarityId = RARITY_DEFS.find((r) => r.name === card.rarity)?.id;
    if (!rarityId || !filter.rarities.includes(rarityId)) return false;
  }

  if (filter.colors.length > 0) {
    const color = card.color.charAt(0).toUpperCase() + card.color.slice(1);
    const secondaryColor = card.secondaryColor
      ? card.secondaryColor.charAt(0).toUpperCase() + card.secondaryColor.slice(1)
      : undefined;
    const matches =
      filter.colors.includes(color) ||
      (secondaryColor !== undefined && filter.colors.includes(secondaryColor));
    if (!matches) return false;
  }

  if (filter.cardTypes.length > 0) {
    const cardType = card.role === "archon" ? "Summoner" : "Monster";
    if (!filter.cardTypes.includes(cardType)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Client-side predicate for CardDistributionRow (card-stats)
// Row fields already use DB format so no value mapping is needed.
// ---------------------------------------------------------------------------

export function matchesCardStatsRow(row: CardDistributionRow, filter: UnifiedCardFilter): boolean {
  if (!matchesEditionFilter(row.edition, row.tier, filter)) return false;
  if (filter.rarities.length > 0 && !filter.rarities.includes(row.rarity)) return false;

  if (filter.colors.length > 0) {
    const hasColor =
      filter.colors.includes(row.color) ||
      (row.secondaryColor !== undefined && filter.colors.includes(row.secondaryColor));
    if (!hasColor) return false;
  }

  if (filter.cardTypes.length > 0 && !filter.cardTypes.includes(row.role)) return false;
  if (filter.foilCategories.length > 0 && !filter.foilCategories.includes(row.foilCategory))
    return false;
  if (filter.selectedCardDetailId > 0 && row.cardDetailId !== filter.selectedCardDetailId)
    return false;

  return true;
}
