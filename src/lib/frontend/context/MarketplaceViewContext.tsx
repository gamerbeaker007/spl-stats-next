"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type MarketplaceViewMode = "card" | "table";

const STORAGE_KEY = "spl-marketplace-view";

interface MarketplaceViewContextValue {
  viewMode: MarketplaceViewMode;
  setViewMode: (mode: MarketplaceViewMode) => void;
}

const MarketplaceViewContext = createContext<MarketplaceViewContextValue | null>(null);

/**
 * Shared card/table preference for all marketplace pages, persisted to
 * localStorage so a given user keeps their preferred layout across sessions.
 * Defaults to `"card"` (visual browsing); switching to `"table"` is remembered.
 */
export function MarketplaceViewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [viewMode, setViewModeState] = useState<MarketplaceViewMode>("card");

  // Read the persisted preference after mount. This must be an effect (not lazy
  // initial state) so the first client render matches the server-rendered default
  // and avoids a hydration mismatch; the stored value is applied once on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "card" || stored === "table") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount localStorage sync
        setViewModeState(stored);
      }
    } catch {
      // localStorage unavailable (private mode / SSR) — keep the default.
    }
  }, []);

  const setViewMode = useCallback((mode: MarketplaceViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore persistence failures; the in-memory preference still applies.
    }
  }, []);

  return (
    <MarketplaceViewContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </MarketplaceViewContext.Provider>
  );
}

export function useMarketplaceView(): MarketplaceViewContextValue {
  const ctx = useContext(MarketplaceViewContext);
  if (!ctx) {
    throw new Error("useMarketplaceView must be used within a MarketplaceViewProvider");
  }
  return ctx;
}
