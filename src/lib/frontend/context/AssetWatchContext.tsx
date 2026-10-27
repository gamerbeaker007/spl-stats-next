"use client";

import AssetWatchButton from "@/components/collection/marketplace/AssetWatchButton";
import { useAssetWatches } from "@/hooks/collection/useAssetWatches";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { getLowestUsdPrice } from "@/lib/shared/marketplace-assets";
import { formatPct, pctChange, pctColor } from "@/lib/shared/card-watch-utils";
import type { AssetWatch } from "@/types/asset-watch";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import { Box, Tooltip, Typography } from "@mui/material";
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface AssetWatchContextValue {
  watches: Record<string, AssetWatch>;
  toggleWatch: (detailId: string, currentPriceUsd: number | undefined) => Promise<void>;
}

const AssetWatchContext = createContext<AssetWatchContextValue | null>(null);

export function useAssetWatchContext() {
  return useContext(AssetWatchContext);
}

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
  const ctx = useAssetWatchContext();
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

/** Percentage change from the saved watch price to the current lowest USD price. */
export function ItemWatchPriceDelta({
  item,
  hideWhenUnavailable = false,
}: Readonly<{ item: MarketplaceAssetItem; hideWhenUnavailable?: boolean }>) {
  const ctx = useAssetWatchContext();
  const currentPrice = getLowestUsdPrice(item.prices);
  return (
    <AssetWatchPriceDelta
      watch={ctx?.watches[item.detailId]}
      currentPriceUsd={currentPrice ?? undefined}
      hideWhenUnavailable={hideWhenUnavailable}
    />
  );
}

/** Percentage change from a saved watch price to a current USD price. */
export function AssetWatchPriceDelta({
  watch,
  currentPriceUsd,
  hideWhenUnavailable = false,
}: Readonly<{
  watch?: AssetWatch;
  currentPriceUsd?: number;
  hideWhenUnavailable?: boolean;
}>) {
  const pct = watch ? pctChange(watch.priceAtWatch, currentPriceUsd) : null;

  if (pct === null || !watch || !currentPriceUsd) {
    return hideWhenUnavailable ? null : (
      <Typography component="span" variant="caption">
        -
      </Typography>
    );
  }

  const title = (
    <Box>
      <Typography variant="caption" display="block">
        Difference since watched
      </Typography>
      <Typography variant="caption" display="block">
        Watched: ${watch.priceAtWatch.toFixed(3)} → Current: ${currentPriceUsd.toFixed(3)}
      </Typography>
      <Typography variant="caption" display="block">
        Watched since {new Date(watch.watchedAt).toLocaleString()}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={title} arrow>
      <Typography
        component="span"
        variant="caption"
        sx={{ color: pctColor(pct), ml: 0.5, cursor: "help", whiteSpace: "nowrap" }}
      >
        {formatPct(pct)}
      </Typography>
    </Tooltip>
  );
}
