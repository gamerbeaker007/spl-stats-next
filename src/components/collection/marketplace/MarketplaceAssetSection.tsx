"use client";

import MarketActionDialogHost, {
  type MarketActionMode,
  type MarketActionState,
} from "@/components/collection/marketplace/MarketActionDialogHost";
import MarketAssetCard from "@/components/collection/marketplace/MarketAssetCard";
import MarketAssetTable from "@/components/collection/marketplace/MarketAssetTable";
import MarketFilterBar from "@/components/collection/marketplace/MarketFilterBar";
import { LoadingSpinnerOverlay } from "@/components/ui/LoadingSpinnerOverlay";
import { useMarketplaceAssetsPageData } from "@/hooks/collection/useMarketplaceAssetsPageData";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  applyMarketAssetFilters,
  DEFAULT_MARKET_ASSET_FILTER,
  getActualOwnedQuantity,
  getLowestUsdPrice,
  type MarketAssetFilter,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import { Alert, Box, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { useMemo, useState, type ReactNode } from "react";

interface MarketplaceAssetSectionProps {
  assetName: MarketplaceAssetName;
  /** Optional section heading (used when several asset types share one page, e.g. Totems). */
  title?: string;
  /** Render the item description prominently on each card (e.g. Titles). */
  showDescription?: boolean;
  /** Extra filter predicate applied before the shared price/sort filters (e.g. Packs set filter). */
  itemFilter?: (item: MarketplaceAssetItem) => boolean;
  /** Extra filter controls rendered above the standard filter bar (e.g. the Packs set selector). */
  filterControls?: ReactNode;
}

/**
 * A single marketplace asset type rendered as a shopping section: search, owned
 * toggle, price/sort filters, and a grid of asset cards (buy, transfer, list).
 * Reads the selected account from the shared `useAccounts()` context so multiple
 * sections on one page stay in sync.
 */
export default function MarketplaceAssetSection({
  assetName,
  title,
  showDescription = false,
  itemFilter,
  filterControls,
}: Readonly<MarketplaceAssetSectionProps>) {
  const { isAuthenticated } = useAuth();
  const { selectedAccount } = useAccounts();
  const { viewMode } = useMarketplaceView();
  const { collectionRefreshVersion, notifyBalancesRefresh, notifyCollectionRefresh } =
    usePurchasePlan();

  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [dialogState, setDialogState] = useState<MarketActionState | null>(null);

  const {
    data,
    loading,
    error,
    refresh: refreshMarketplaceData,
  } = useMarketplaceAssetsPageData(
    isAuthenticated ? selectedAccount : null,
    assetName,
    collectionRefreshVersion
  );

  const outbidStatuses = useMemo(
    () => new Map((data?.outbidStatuses ?? []).map((status) => [status.detailId, status])),
    [data?.outbidStatuses]
  );

  const myListingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of data?.playerListings ?? []) {
      if (listing.status !== 1 || listing.quantityRemaining < 1) continue;
      counts.set(listing.detailId, (counts.get(listing.detailId) ?? 0) + listing.quantityRemaining);
    }
    return counts;
  }, [data?.playerListings]);

  const items = useMemo<MarketplaceAssetItem[]>(() => {
    const query = search.trim().toLowerCase();
    const base = (data?.items ?? []).filter((item) => {
      if (isAuthenticated && ownedOnly && getActualOwnedQuantity(item) < 1) return false;
      if (query && !item.displayName.toLowerCase().includes(query)) return false;
      if (itemFilter && !itemFilter(item)) return false;
      return true;
    });

    const withOutbid =
      isAuthenticated && filter.outbidOnly
        ? base.filter((item) => {
            const status = outbidStatuses.get(item.detailId);
            return Boolean(status?.isOutbid);
          })
        : base;

    return applyMarketAssetFilters(withOutbid, filter);
  }, [data?.items, filter, isAuthenticated, itemFilter, outbidStatuses, ownedOnly, search]);

  const handleAction = (mode: MarketActionMode, item: MarketplaceAssetItem) => {
    setDialogState({ mode, item, defaultListPriceUsd: getLowestUsdPrice(item.prices) });
  };

  const resolvedDialogState = useMemo<MarketActionState | null>(() => {
    if (!dialogState) return null;
    const currentItem =
      data?.items.find((item) => item.detailId === dialogState.item.detailId) ?? dialogState.item;
    return { ...dialogState, item: currentItem };
  }, [data?.items, dialogState]);

  const handleCompleted = async () => {
    if (!selectedAccount) return;

    // Invalidate the server caches first so the client re-fetch gets fresh data.
    const tags: Parameters<typeof revalidateTagsAction>[0] = [
      { type: "marketplace", usernames: [selectedAccount] },
      { type: "balances", usernames: [selectedAccount] },
    ];
    if (assetName === "SKINS") {
      tags.push({ type: "player-skins", usernames: [selectedAccount] });
    }

    await revalidateTagsAction(tags);
    await refreshMarketplaceData();
    notifyBalancesRefresh();
    notifyCollectionRefresh();
  };

  return (
    <Stack spacing={1.5}>
      {title && <Typography variant="h6">{title}</Typography>}

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ rowGap: 1 }}
      >
        <TextField
          size="small"
          label="Search..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 220 }}
        />
        {isAuthenticated && (
          <FormControlLabel
            control={
              <Switch checked={ownedOnly} onChange={(_e, checked) => setOwnedOnly(checked)} />
            }
            label="Owned items only"
          />
        )}
        <MarketFilterBar filter={filter} onChange={setFilter} showOutbidFilter={isAuthenticated} />
      </Stack>

      {filterControls}

      <Box sx={{ position: "relative", minHeight: 80 }}>
        <LoadingSpinnerOverlay loading={loading} message="Loading market items..." />

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading &&
          !error &&
          items.length === 0 &&
          (isAuthenticated && filter.outbidOnly ? (
            <Alert severity="info">
              No outbid listings found for this asset type. Try turning off the Outbid filter.
            </Alert>
          ) : (
            <Alert severity="info">No market items match the selected filters.</Alert>
          ))}

        {viewMode === "table" ? (
          <MarketAssetTable
            items={items}
            onAction={handleAction}
            outbidStatuses={outbidStatuses}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {items.map((item) => (
              <MarketAssetCard
                key={item.detailId}
                item={item}
                onAction={handleAction}
                showDescription={showDescription}
                outbidStatus={outbidStatuses.get(item.detailId)}
                myListingCount={myListingCounts.get(item.detailId) ?? 0}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </Box>
        )}
      </Box>

      <MarketActionDialogHost
        state={resolvedDialogState}
        assetName={assetName}
        account={selectedAccount}
        onClose={() => setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </Stack>
  );
}
