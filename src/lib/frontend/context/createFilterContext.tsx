"use client";

import type { UnifiedCardFilter } from "@/types/card-filter";
import { useLocalStorageValue } from "@/hooks/useLocalStorageValue";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface FilterContextValue<F extends UnifiedCardFilter> {
  filter: F;
  setFilter: (updates: Partial<F>) => void;
  resetFilter: (overrides?: Partial<F>) => void;
  toggleFilterOpen: () => void;
}

export function createFilterContext<F extends UnifiedCardFilter>(defaults: F, storageKey?: string) {
  const Context = createContext<FilterContextValue<F> | undefined>(undefined);

  function parseStoredFilter(raw: string | null | undefined): F {
    if (!raw) return { ...defaults };
    try {
      return { ...defaults, ...(JSON.parse(raw) as Partial<F>) };
    } catch {
      // Ignore malformed stored state and fall back to the defaults.
    }
    return { ...defaults };
  }

  function Provider({ children }: { children: ReactNode }) {
    const [storedValue, setStoredValue] = useLocalStorageValue(storageKey ?? "");
    const [filterOverride, setFilterOverride] = useState<F | null>(null);
    const filter = filterOverride ?? parseStoredFilter(storageKey ? storedValue : null);

    const persistFilter = useCallback(
      (next: F) => {
        setFilterOverride(next);
        if (storageKey) setStoredValue(JSON.stringify(next));
      },
      [setStoredValue]
    );

    const setFilter = useCallback(
      (updates: Partial<F>) => persistFilter({ ...filter, ...updates }),
      [filter, persistFilter]
    );

    const resetFilter = useCallback(
      (overrides?: Partial<F>) => persistFilter({ ...defaults, ...overrides }),
      [persistFilter]
    );

    const toggleFilterOpen = useCallback(
      () => persistFilter({ ...filter, filterOpen: !filter.filterOpen }),
      [filter, persistFilter]
    );

    return (
      <Context.Provider value={{ filter, setFilter, resetFilter, toggleFilterOpen }}>
        {children}
      </Context.Provider>
    );
  }

  function useFilter(): FilterContextValue<F> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error("useFilter must be used inside its Provider");
    return ctx;
  }

  return { Provider, useFilter };
}
