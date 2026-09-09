"use client";

import MarketAssetTable from "@/components/collection/marketplace/MarketAssetTable";
import { SkinCardGrid } from "@/components/collection/skins/SkinCardGrid";
import { SkinGroupRow } from "@/components/collection/skins/SkinGroupRow";
import { LoadMoreSentinel } from "@/components/ui/LoadMoreSentinel";
import { useIncrementalViewportList } from "@/hooks/collection/useIncrementalViewportList";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import type { SkinCardPresentation, SkinGroupViewModel } from "@/types/skins";
import { Stack } from "@mui/material";

interface SkinsResultsViewProps {
  /** Table layout always shows the flat skin list (no base card). */
  tableMode: boolean;
  flatMode: boolean;
  rows: SkinGroupViewModel[];
  flatSkins: MarketplaceAssetItem[];
  /** Restarts the lazy-load window when the selection changes — not on a data refresh. */
  listResetKey: string;
  presentation: SkinCardPresentation;
}

/** Renders the skins in whichever layout is active: table, flat grid or grouped by base card. */
export function SkinsResultsView({
  tableMode,
  flatMode,
  rows,
  flatSkins,
  listResetKey,
  presentation,
}: Readonly<SkinsResultsViewProps>) {
  const flatList = useIncrementalViewportList(flatSkins, {
    enabled: !tableMode && flatMode,
    batchSize: 60,
    resetKey: listResetKey,
  });

  const groupedList = useIncrementalViewportList(rows, {
    enabled: !tableMode && !flatMode,
    batchSize: 14,
    resetKey: listResetKey,
  });

  if (tableMode) {
    return (
      <MarketAssetTable
        items={flatSkins}
        onAction={presentation.onAction}
        outbidStatuses={presentation.outbidStatuses}
        isAuthenticated={presentation.isAuthenticated}
      />
    );
  }

  if (flatMode) {
    return (
      <>
        <SkinCardGrid skins={flatList.visibleItems} presentation={presentation} />

        {flatList.hasMore && (
          <LoadMoreSentinel
            sentinelRef={flatList.sentinelRef}
            isLoadingMore={flatList.isLoadingMore}
            loadingLabel="Loading more skins..."
            idleLabel={`Showing ${flatList.visibleCount}/${flatSkins.length}. Scroll to load more.`}
          />
        )}
      </>
    );
  }

  return (
    <Stack spacing={3}>
      {groupedList.visibleItems.map((row) => (
        <SkinGroupRow
          key={`${row.group.cardDetailId}-${row.group.groupName}`}
          row={row}
          presentation={presentation}
        />
      ))}

      {groupedList.hasMore && (
        <LoadMoreSentinel
          sentinelRef={groupedList.sentinelRef}
          isLoadingMore={groupedList.isLoadingMore}
          loadingLabel="Loading more skin groups..."
          idleLabel={`Showing ${groupedList.visibleCount}/${rows.length} groups. Scroll to load more.`}
        />
      )}
    </Stack>
  );
}
