"use client";

import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";
import { Stack } from "@mui/material";

export default function MusicPageClient() {
  return (
    <Stack spacing={3}>
      <MarketplaceAccountBar />

      <MarketplaceAssetSection assetName="MUSIC" />
    </Stack>
  );
}
