"use client";

import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";
import { Divider, Stack } from "@mui/material";

/**
 * Land shopping page. Land plots (`LAND`), deeds (`DEEDS`), and land resources
 * (`LAND_RESOURCES`, e.g. Time Crystals) are separate marketplace asset types, so
 * they render as labelled sections sharing one account selector.
 */
export default function LandPageClient() {
  return (
    <Stack spacing={3}>
      <MarketplaceAccountBar />

      <MarketplaceAssetSection assetName="LAND_RESOURCES" title="Land Resources" />

      <Divider />

      <MarketplaceAssetSection assetName="LAND" title="Land" />

      <Divider />

      <MarketplaceAssetSection assetName="DEEDS" title="Deeds" />
    </Stack>
  );
}
