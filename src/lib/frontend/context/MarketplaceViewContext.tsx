"use client";

import { useLocalStorageValue } from "@/hooks/useLocalStorageValue";
import { createContext, useCallback, useContext, type ReactNode } from "react";

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
  // `null` on the server and during hydration, so the first client render matches the
  // server-rendered default; the stored preference applies right after.
  const [stored, setStored] = useLocalStorageValue(STORAGE_KEY);
  const viewMode: MarketplaceViewMode = stored === "table" ? "table" : "card";

  const setViewMode = useCallback((mode: MarketplaceViewMode) => setStored(mode), [setStored]);

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
