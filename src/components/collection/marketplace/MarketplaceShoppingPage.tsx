"use client";

import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";

interface MarketplaceShoppingPageProps {
  assetName: MarketplaceAssetName;
  searchLabel: string;
  ownedLabel: string;
  emptyLabel: string;
  loadingLabel: string;
  showDescription?: boolean;
  itemFilter?: (item: MarketplaceAssetItem) => boolean;
  filterControls?: ReactNode;
}

/**
 * A single-asset-type marketplace shopping page: the shared account selector plus
 * one asset section. Thin wrapper so routes only supply per-asset labels.
 */
export default function MarketplaceShoppingPage(props: Readonly<MarketplaceShoppingPageProps>) {
  return (
    <Stack spacing={2.5}>
      <MarketplaceAccountBar />
      <MarketplaceAssetSection {...props} />
    </Stack>
  );
}
