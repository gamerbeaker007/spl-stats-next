"use client";

import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";
import { Divider, Stack } from "@mui/material";

/**
 * Totems shopping page. Complete totems (`TOTEM_ITEMS`) and totem fragments
 * (`TOTEM_FRAGMENTS`) are separate marketplace asset types, so they render as two
 * labelled sections sharing one account selector.
 */
export default function TotemsPageClient() {
  return (
    <Stack spacing={3}>
      <MarketplaceAccountBar />

      <MarketplaceAssetSection assetName="TOTEMS" title="Totems Claims" />

      <Divider />
      <MarketplaceAssetSection assetName="TOTEM_ITEMS" title="Totems" />

      <Divider />

      <MarketplaceAssetSection assetName="TOTEM_FRAGMENTS" title="Totem Fragments" />
    </Stack>
  );
}
