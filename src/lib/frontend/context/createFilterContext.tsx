"use client";

import type { UnifiedCardFilter } from "@/types/card-filter";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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
    // Start from defaults so the first client render matches the server-rendered
    // HTML. Persisted state is loaded after mount to avoid a hydration mismatch.
    const [filter, setFilterState] = useState<F>(() => ({ ...defaults }));
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      // Hydrate from localStorage after mount — reading it during render would
      // cause an SSR/client hydration mismatch, so the sync must live in an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterState(loadFromStorage());
      setHydrated(true);
    }, []);

    useEffect(() => {
      // Don't persist until the stored value has been loaded, otherwise the
      // initial defaults would clobber it before hydration completes.
      if (!storageKey || !hydrated) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(filter));
      } catch {
        // ignore storage errors
      }
    }, [filter, hydrated]);

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
