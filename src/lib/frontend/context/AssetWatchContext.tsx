"use client";

import AssetWatchButton from "@/components/collection/marketplace/AssetWatchButton";
import { useAssetWatches } from "@/hooks/collection/useAssetWatches";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { getLowestUsdPrice } from "@/lib/shared/marketplace-assets";
import type { AssetWatch } from "@/types/asset-watch";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface AssetWatchContextValue {
  watches: Record<string, AssetWatch>;
  toggleWatch: (detailId: string, currentPriceUsd: number | undefined) => Promise<void>;
}

const AssetWatchContext = createContext<AssetWatchContextValue | null>(null);

/** Loads the user's watches once per page so every card/row can show its heart. */
export function AssetWatchProvider({
  assetName,
  children,
}: Readonly<{ assetName: MarketplaceAssetName; children: ReactNode }>) {
  const { isAuthenticated } = useAuth();
  const { watches, toggleWatch } = useAssetWatches(assetName, isAuthenticated);
  const value = useMemo(
    () => (isAuthenticated ? { watches, toggleWatch } : null),
    [isAuthenticated, toggleWatch, watches]
  );
  return <AssetWatchContext.Provider value={value}>{children}</AssetWatchContext.Provider>;
}

/** Heart for one item; renders nothing outside a provider or when logged out. */
export function ItemWatchButton({ item }: Readonly<{ item: MarketplaceAssetItem }>) {
  const ctx = useContext(AssetWatchContext);
  if (!ctx) return null;
  const price = getLowestUsdPrice(item.prices) ?? undefined;
  return (
    <AssetWatchButton
      watch={ctx.watches[item.detailId]}
      currentPriceUsd={price}
      onToggle={() => ctx.toggleWatch(item.detailId, price)}
    />
  );
}
