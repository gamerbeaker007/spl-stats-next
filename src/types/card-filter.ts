import type { CardFoil } from "@/types/card";

export interface UnifiedCardFilter {
  // Card attributes (empty array = all)
  editions: number[];
  promoTiers: number[];
  rewardTiers: number[];
  extraTiers: number[];
  rarities: number[]; // 1-4 numeric (DB/API format)
  colors: string[]; // "Red", "Blue", etc. (DB/API format)
  cardTypes: string[]; // "Monster" | "Summoner"
  foilCategories: CardFoil[];
  cardName: string;
  selectedCardDetailId: number; // 0 = none
  hideMissingCards: boolean; // multi-dashboard display option

  // Sorting — frontend controls whether to show UI
  sortBy: "battles" | "win_percentage" | "wins" | "losses";

  // Grouping — frontend controls whether to show UI
  groupLevels: boolean;
  groupFoils: boolean;

  // Battle-specific (empty/zero = inactive/all)
  account: string;
  formats: string[];
  matchTypes: string[];
  rulesets: string[];
  sinceDays: number;
  minManaCap: number;
  maxManaCap: number;
  minBattleCount: number;
  topCount: number;

  // UI state
  filterOpen: boolean;
}

export const DEFAULT_UNIFIED_FILTER: UnifiedCardFilter = {
  editions: [],
  promoTiers: [],
  rewardTiers: [],
  extraTiers: [],
  rarities: [],
  colors: [],
  cardTypes: [],
  foilCategories: [],
  cardName: "",
  selectedCardDetailId: 0,
  hideMissingCards: false,
  sortBy: "battles",
  groupLevels: true,
  groupFoils: true,
  account: "",
  formats: [],
  matchTypes: [],
  rulesets: [],
  sinceDays: 0,
  minManaCap: 0,
  maxManaCap: 0,
  minBattleCount: 1,
  topCount: 5,
  filterOpen: true,
};

export interface FilterDrawerConfig {
  ariaLabel?: string;
  // Card attribute sections
  showEditions?: boolean;
  showRarities?: boolean;
  showColors?: boolean;
  showCardTypes?: boolean;
  showFoils?: boolean;
  showCardSearch?: boolean;
  showHideMissing?: boolean;
  // Battle-specific sections
  showAccount?: boolean;
  showFormats?: boolean;
  showMatchTypes?: boolean;
  showMana?: boolean;
  showSinceDays?: boolean;
  // Display/sort options
  showSorting?: boolean;
  showGrouping?: boolean;
  showTopCount?: boolean;
  showMinBattleCount?: boolean;
}

// Storage keys — import these in auth logout to clear all filter state
export const FILTER_STORAGE_KEYS = {
  collection: "card-filter",
  cardStats: "card-stats-filter",
  battles: "battle-filter",
} as const;
