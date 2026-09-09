"use client";

import MarketAssetCard from "@/components/collection/marketplace/MarketAssetCard";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import type { SkinCardPresentation } from "@/types/skins";
import { Box } from "@mui/material";

interface SkinCardGridProps {
  skins: MarketplaceAssetItem[];
  presentation: SkinCardPresentation;
  /** `flex-start` keeps rows top-aligned next to a full-height base card. */
  alignContent?: "flex-start" | "stretch";
}

/** Wrapping grid of skin tiles — used by the flat layout and inside each grouped row. */
export function SkinCardGrid({
  skins,
  presentation,
  alignContent = "stretch",
}: Readonly<SkinCardGridProps>) {
  const { onAction, outbidStatuses, myListingCounts, isAuthenticated } = presentation;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignContent }}>
      {skins.map((skin) => (
        <MarketAssetCard
          key={skin.detailId}
          item={skin}
          onAction={onAction}
          outbidStatus={outbidStatuses.get(skin.detailId)}
          myListingCount={myListingCounts.get(skin.detailId) ?? 0}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </Box>
  );
}
