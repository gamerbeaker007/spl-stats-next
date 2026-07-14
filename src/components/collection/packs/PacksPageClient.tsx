"use client";

import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import MarketplaceAssetSection from "@/components/collection/marketplace/MarketplaceAssetSection";
import PackSetFilter from "@/components/collection/marketplace/PackSetFilter";
import { packDetailIdsForSets } from "@/lib/shared/marketplace-pack-sets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";

/** Packs shopping page: browse and buy card packs, filtered by set. */
export default function PacksPageClient() {
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());

  const allowedDetailIds = useMemo(() => packDetailIdsForSets(selectedSets), [selectedSets]);

  // Empty selection = no set filter (show all packs).
  const itemFilter = useCallback(
    (item: MarketplaceAssetItem) =>
      allowedDetailIds.size === 0 || allowedDetailIds.has(item.detailId),
    [allowedDetailIds]
  );

  return (
    <Stack spacing={2.5}>
      <MarketplaceAccountBar />
      <MarketplaceAssetSection
        assetName="PACKS"
        itemFilter={itemFilter}
        filterControls={<PackSetFilter selected={selectedSets} onChange={setSelectedSets} />}
      />
    </Stack>
  );
}
