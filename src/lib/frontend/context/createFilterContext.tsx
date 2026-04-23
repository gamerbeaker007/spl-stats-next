"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UnifiedCardFilter } from "@/types/card-filter";

export interface FilterContextValue<F extends UnifiedCardFilter> {
  filter: F;
  setFilter: (updates: Partial<F>) => void;
  resetFilter: (overrides?: Partial<F>) => void;
  toggleFilterOpen: () => void;
}

export function createFilterContext<F extends UnifiedCardFilter>(defaults: F, storageKey?: string) {
  const Context = createContext<FilterContextValue<F> | undefined>(undefined);

  function loadFromStorage(): F {
    if (!storageKey) return { ...defaults };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<F>) };
    } catch {
      // ignore parse or storage errors
    }
    return { ...defaults };
  }

  function Provider({ children }: { children: ReactNode }) {
    // Lazy init: server gets defaults, client gets localStorage (avoids hydration mismatch)
    const [filter, setFilterState] = useState<F>(() =>
      typeof window !== "undefined" ? loadFromStorage() : { ...defaults }
    );

    useEffect(() => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(filter));
      } catch {
        // ignore storage errors
      }
    }, [filter]);

    const setFilter = useCallback((updates: Partial<F>) => {
      setFilterState((prev) => ({ ...prev, ...updates }));
    }, []);

    const resetFilter = useCallback((overrides?: Partial<F>) => {
      setFilterState({ ...defaults, ...overrides });
    }, []);

    const toggleFilterOpen = useCallback(() => {
      setFilterState((prev) => ({ ...prev, filterOpen: !prev.filterOpen }));
    }, []);

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
