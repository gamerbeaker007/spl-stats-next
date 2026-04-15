"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CardDistributionRow, FoilCategory } from "@/types/card-stats";

const STORAGE_KEY = "card-stats-filter";

// ---------------------------------------------------------------------------
// Filter type
// ---------------------------------------------------------------------------

export interface CardStatsFilter {
  /** Native edition IDs; [] = all. */
  editions: number[];
  /** Tier values for promo cards (edition=2); [] = all. */
  promoTiers: number[];
  /** Tier values for reward cards (edition=3); [] = all. */
  rewardTiers: number[];
  /** Tier values for extra cards (edition=17); [] = all. */
  extraTiers: number[];
  /** Numeric rarity values 1-4; [] = all. */
  rarities: number[];
  /** Element colour strings e.g. "Red", "Blue"; [] = all. */
  colors: string[];
  /** Card types "Monster" | "Summoner"; [] = all. */
  cardTypes: string[];
  /** Foil categories; [] = all. */
  foilCategories: FoilCategory[];
  filterOpen: boolean;
}

export const DEFAULT_CARD_STATS_FILTER: CardStatsFilter = {
  editions: [],
  promoTiers: [],
  rewardTiers: [],
  extraTiers: [],
  rarities: [],
  colors: [],
  cardTypes: [],
  foilCategories: [],
  filterOpen: true,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CardStatsFilterContextType {
  filter: CardStatsFilter;
  setFilter: (updates: Partial<CardStatsFilter>) => void;
  resetFilter: () => void;
  toggleFilterOpen: () => void;
  filterRow: (row: CardDistributionRow) => boolean;
}

const CardStatsFilterContext = createContext<CardStatsFilterContextType | undefined>(undefined);

export function useCardStatsFilter(): CardStatsFilterContextType {
  const ctx = useContext(CardStatsFilterContext);
  if (!ctx) throw new Error("useCardStatsFilter must be used within CardStatsFilterProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Row filter logic
// ---------------------------------------------------------------------------

function matchesEdition(
  row: CardDistributionRow,
  editions: number[],
  promoTiers: number[],
  rewardTiers: number[],
  extraTiers: number[]
): boolean {
  const hasAny =
    editions.length > 0 ||
    promoTiers.length > 0 ||
    rewardTiers.length > 0 ||
    extraTiers.length > 0;
  if (!hasAny) return true;

  const { edition, tier } = row;
  if (edition === 2) return tier !== null && promoTiers.includes(tier);
  if (edition === 3) return tier !== null && rewardTiers.includes(tier);
  if (edition === 17) return tier !== null && extraTiers.includes(tier);
  return editions.includes(edition);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function loadFromStorage(): CardStatsFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CardStatsFilter>;
      return { ...DEFAULT_CARD_STATS_FILTER, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CARD_STATS_FILTER };
}

export function CardStatsFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<CardStatsFilter>(() =>
    typeof window !== "undefined" ? loadFromStorage() : { ...DEFAULT_CARD_STATS_FILTER }
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
    } catch {
      // ignore
    }
  }, [filter]);

  const setFilter = useCallback((updates: Partial<CardStatsFilter>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilterState({ ...DEFAULT_CARD_STATS_FILTER });
  }, []);

  const toggleFilterOpen = useCallback(() => {
    setFilterState((prev) => ({ ...prev, filterOpen: !prev.filterOpen }));
  }, []);

  const filterRow = useCallback(
    (row: CardDistributionRow): boolean => {
      if (!matchesEdition(row, filter.editions, filter.promoTiers, filter.rewardTiers, filter.extraTiers))
        return false;

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

      return true;
    },
    [filter]
  );

  return (
    <CardStatsFilterContext.Provider
      value={{ filter, setFilter, resetFilter, toggleFilterOpen, filterRow }}
    >
      {children}
    </CardStatsFilterContext.Provider>
  );
}
