"use client";

import AssetWatchButton from "@/components/collection/marketplace/AssetWatchButton";
import {
  AssetWatchPriceDelta,
  useAssetWatchContext,
} from "@/lib/frontend/context/AssetWatchContext";
import { landMarketWatchId } from "@/lib/shared/land-market";
import type { LandMarketListing } from "@/types/land/landMarket";
import { Stack } from "@mui/material";

export default function LandMarketWatch({
  listing,
  display = "both",
}: Readonly<{ listing: LandMarketListing; display?: "both" | "button" | "delta" }>) {
  const context = useAssetWatchContext();
  if (!context) return null;

  const detailId = landMarketWatchId(listing.deedUid);
  const watch = context.watches[detailId];

  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      {display !== "delta" && (
        <AssetWatchButton
          watch={watch}
          currentPriceUsd={listing.priceUsd}
          onToggle={() => void context.toggleWatch(detailId, listing.priceUsd)}
        />
      )}
      {display !== "button" && (
        <AssetWatchPriceDelta
          watch={watch}
          currentPriceUsd={listing.priceUsd}
          hideWhenUnavailable
        />
      )}
    </Stack>
  );
}
