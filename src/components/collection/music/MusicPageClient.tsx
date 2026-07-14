"use client";

import { Stack } from "@mui/material";
import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";

export default function MusicPageClient() {
  return (
    <Stack spacing={3}>
      <MarketplaceAccountBar />

      <MarketplaceAssetSection assetName="MUSIC" title="Music" />
    </Stack>
  );
}
