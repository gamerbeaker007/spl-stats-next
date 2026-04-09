"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type BattleFilter, DEFAULT_BATTLE_FILTER } from "@/types/battles";

const STORAGE_KEY = "battle-filter";

interface BattleFilterContextType {
  filter: BattleFilter;
  setFilter: (updates: Partial<BattleFilter>) => void;
  resetFilter: (overrides?: Partial<BattleFilter>) => void;
  toggleFilterOpen: () => void;
}

const BattleFilterContext = createContext<BattleFilterContextType | undefined>(undefined);

function loadFromStorage(): BattleFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BattleFilter>;
      // Merge with defaults so new fields are populated even after updates
      return { ...DEFAULT_BATTLE_FILTER, ...parsed, filterOpen: parsed.filterOpen ?? true };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_BATTLE_FILTER };
}

export function BattleFilterProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: server gets defaults, client gets localStorage.
  // BattleFilterProvider is only used on battles list pages (client components),
  // so no SSR/hydration mismatch occurs from reading localStorage here.
  const [filter, setFilterState] = useState<BattleFilter>(() =>
    typeof window !== "undefined" ? loadFromStorage() : { ...DEFAULT_BATTLE_FILTER }
  );

  // Persist to localStorage whenever filter changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
    } catch {
      // ignore storage errors
    }
  }, [filter]);

  const setFilter = useCallback((updates: Partial<BattleFilter>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilter = useCallback((overrides?: Partial<BattleFilter>) => {
    setFilterState({ ...DEFAULT_BATTLE_FILTER, ...overrides });
  }, []);

  const toggleFilterOpen = useCallback(() => {
    setFilterState((prev) => ({ ...prev, filterOpen: !prev.filterOpen }));
  }, []);

  return (
    <BattleFilterContext.Provider value={{ filter, setFilter, resetFilter, toggleFilterOpen }}>
      {children}
    </BattleFilterContext.Provider>
  );
}

export function useBattleFilter(): BattleFilterContextType {
  const ctx = useContext(BattleFilterContext);
  if (!ctx) throw new Error("useBattleFilter must be used inside BattleFilterProvider");
  return ctx;
}
