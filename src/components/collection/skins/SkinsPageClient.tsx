"use client";

import { CardFilterDrawer } from "@/components/collection/cards/CardFilterDrawer";
import MarketActionDialogHost, {
  type MarketActionMode,
  type MarketActionState,
} from "@/components/collection/marketplace/MarketActionDialogHost";
import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import { SkinsFilterBar } from "@/components/collection/skins/SkinsFilterBar";
import { SkinsResultsView } from "@/components/collection/skins/SkinsResultsView";
import { LoadingSpinnerOverlay } from "@/components/ui/LoadingSpinnerOverlay";
import { useMarketplaceAssetsPageData } from "@/hooks/collection/useMarketplaceAssetsPageData";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import {
  applyMarketAssetFilters,
  DEFAULT_MARKET_ASSET_FILTER,
  getActualOwnedQuantity,
  getLowestUsdPrice,
  isSkinActive,
  type MarketAssetFilter,
} from "@/lib/shared/marketplace-assets";
import {
  chooseRepresentativeCard,
  findCardCandidates,
  resolveGroupBaseSkin,
} from "@/lib/shared/skin-groups";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import type { SkinCardPresentation, SkinGroupViewModel, SkinViewMode } from "@/types/skins";
import { Alert, Box, Chip, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";

export default function SkinsPageClient() {
  const { isAuthenticated } = useAuth();
  const { collectionRefreshVersion, notifyBalancesRefresh, notifyCollectionRefresh } =
    usePurchasePlan();
  const { selectedAccount } = useAccounts();
  const { filter: cardFilter } = useCardFilter();
  const { viewMode: layoutMode } = useMarketplaceView();

  const [ownedOnly, setOwnedOnly] = useState(false);
  const [missingEquippedOnly, setMissingEquippedOnly] = useState(false);
  const [selectedSkinSet, setSelectedSkinSet] = useState("");
  const [marketFilter, setMarketFilter] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [viewMode, setViewMode] = useState<SkinViewMode>("grouped");
  const [dialogState, setDialogState] = useState<MarketActionState | null>(null);

  const {
    data,
    loading,
    error,
    refresh: refreshMarketplaceData,
  } = useMarketplaceAssetsPageData(
    isAuthenticated ? selectedAccount : null,
    "SKINS",
    collectionRefreshVersion,
    {
      includeDetailedCollection: true,
      includeOutbidStatuses: true,
    }
  );

  // Grouped shows base card + its skins; flat shows only skin cards.
  const flatMode = viewMode === "flat";
  const tableMode = layoutMode === "table";

  const skinSets = useMemo(
    () =>
      Array.from(
        new Set((data?.groups ?? []).flatMap((group) => group.items.map((skin) => skin.setName)))
      ).sort(),
    [data?.groups]
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

  // Grouped (default) rows: base card + its skins.
  const rows = useMemo<SkinGroupViewModel[]>(() => {
    return (data?.groups ?? [])
      .map((group) => {
        const cardCandidates = findCardCandidates(data?.detailedCollection, group.cardDetailId);
        const card = chooseRepresentativeCard(group.items, cardCandidates);
        const totalOwnedCards = cardCandidates.reduce(
          (sum, entry) => sum + (entry.allCards?.length ?? 0),
          0
        );

        const setOwnedSkins = group.items.filter((skin) => {
          if (selectedSkinSet && skin.setName !== selectedSkinSet) return false;
          if (isAuthenticated && ownedOnly && getActualOwnedQuantity(skin) < 1) return false;
          if (
            isAuthenticated &&
            marketFilter.outbidOnly &&
            !outbidStatuses.get(skin.detailId)?.isOutbid
          ) {
            return false;
          }
          return true;
        });

        return {
          group,
          card,
          visibleSkins: applyMarketAssetFilters(setOwnedSkins, marketFilter),
          totalOwnedCards,
          totalOwnedSkins: group.items.reduce((sum, skin) => sum + getActualOwnedQuantity(skin), 0),
        };
      })
      .filter((row) => {
        if (row.visibleSkins.length === 0) return false;
        if (row.card && !matchesCardFilter(row.card, cardFilter)) return false;
        if (isAuthenticated && cardFilter.hideMissingCards && row.totalOwnedCards < 1) return false;
        // Missing equipped:
        // - actually owns the card
        // - actually owns at least one skin
        // - no owned/equipped skin is active, so the base skin is active
        if (isAuthenticated && missingEquippedOnly) {
          const baseSkinActive = !row.group.items.some(isSkinActive);

          if (row.totalOwnedCards < 1 || row.totalOwnedSkins < 1 || !baseSkinActive) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) => left.group.groupName.localeCompare(right.group.groupName));
  }, [
    data?.detailedCollection,
    data?.groups,
    cardFilter,
    isAuthenticated,
    outbidStatuses,
    selectedSkinSet,
    ownedOnly,
    missingEquippedOnly,
    marketFilter,
  ]);

  // Flat skin list (no base card), used by the flat and table layouts.
  //
  // Derived from `rows` rather than re-filtering `data.groups`, so every layout —
  // and the totals below — shows exactly the same set of skins. Re-running
  // `applyMarketAssetFilters` is only for the global sort; the rows are already
  // filtered, so it drops nothing.
  const flatSkins = useMemo(
    () =>
      applyMarketAssetFilters(
        rows.flatMap((row) => row.visibleSkins),
        marketFilter
      ),
    [rows, marketFilter]
  );

  // Restart the lazy-load window only when the *selection* changes — not when the
  // data is re-fetched after an action (delist, list, transfer, activate), which
  // would otherwise collapse the list back to the first batch and scroll the user
  // away from the skin they just acted on.
  const listResetKey = useMemo(
    () =>
      JSON.stringify([
        selectedAccount,
        isAuthenticated,
        ownedOnly,
        selectedSkinSet,
        marketFilter,
        cardFilter,
        viewMode,
      ]),
    [
      selectedAccount,
      isAuthenticated,
      ownedOnly,
      selectedSkinSet,
      marketFilter,
      cardFilter,
      viewMode,
    ]
  );

  // "How many skins match what I'm currently looking at?" — one skin definition
  // per entry, not per owned copy or per market listing, matching what the grid
  // renders. `owned` counts how many of those same matching skins the selected
  // account holds at least one copy of.
  const skinTotals = useMemo(
    () => ({
      total: flatSkins.length,
      owned: flatSkins.filter((skin) => getActualOwnedQuantity(skin) >= 1).length,
    }),
    [flatSkins]
  );

  const handleAction = useCallback((mode: MarketActionMode, item: MarketplaceAssetItem) => {
    setDialogState({ mode, item, defaultListPriceUsd: getLowestUsdPrice(item.prices) });
  }, []);

  const presentation = useMemo<SkinCardPresentation>(
    () => ({
      onAction: handleAction,
      outbidStatuses,
      myListingCounts,
      isAuthenticated,
    }),
    [handleAction, outbidStatuses, myListingCounts, isAuthenticated]
  );

  const resolvedDialogState = useMemo<MarketActionState | null>(() => {
    if (!dialogState) return null;

    if (dialogState.item.baseSkin) {
      const cardDetailId = dialogState.item.cardDetailId;
      const group =
        cardDetailId !== null
          ? data?.groups.find((entry) => entry.cardDetailId === cardDetailId)
          : undefined;
      if (!group) return dialogState;

      const card = chooseRepresentativeCard(
        group.items,
        findCardCandidates(data?.detailedCollection, group.cardDetailId)
      );

      return { ...dialogState, item: resolveGroupBaseSkin(group, card).baseSkinItem };
    }

    const currentItem =
      data?.groups
        .flatMap((group) => group.items)
        .find((item) => item.detailId === dialogState.item.detailId) ?? dialogState.item;
    return { ...dialogState, item: currentItem };
  }, [data?.detailedCollection, data?.groups, dialogState]);

  const handleCompleted = async () => {
    if (!selectedAccount) return;

    await revalidateTagsAction([
      { type: "marketplace", usernames: [selectedAccount] },
      { type: "balances", usernames: [selectedAccount] },
      { type: "player-skins", usernames: [selectedAccount] },
    ]);
    await refreshMarketplaceData();
    notifyBalancesRefresh();
    notifyCollectionRefresh();
  };

  // Table layout always shows the flat skin list (no base card).
  const isEmpty = tableMode || flatMode ? flatSkins.length === 0 : rows.length === 0;
  const emptyMessage =
    isAuthenticated && marketFilter.outbidOnly
      ? "No outbid skin listings found. Try turning off the Outbid filter."
      : "No skin data matches the selected filters.";

  return (
    <Box display="flex" flex={1}>
      <Box flex={1}>
        <Stack spacing={2}>
          <MarketplaceAccountBar />

          <SkinsFilterBar
            isAuthenticated={isAuthenticated}
            ownedOnly={ownedOnly}
            onOwnedOnlyChange={setOwnedOnly}
            missingEquippedOnly={missingEquippedOnly}
            onMissingEquippedOnlyChange={setMissingEquippedOnly}
            skinSets={skinSets}
            selectedSkinSet={selectedSkinSet}
            onSelectedSkinSetChange={setSelectedSkinSet}
            marketFilter={marketFilter}
            onMarketFilterChange={setMarketFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewModeToggle={!tableMode}
          />

          {loading && (
            <LoadingSpinnerOverlay loading={loading} message="Loading marketplace skins..." />
          )}

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && isEmpty && <Alert severity="info">{emptyMessage}</Alert>}

          {/* Hidden while reloading: the hook keeps the previous account's
                    data, and a stale exact number misleads more than a missing one. */}
          {data && !loading && (
            <Chip
              size="small"
              variant="outlined"
              label={
                isAuthenticated && selectedAccount
                  ? `Number of skins: ${skinTotals.total} (${skinTotals.owned} owned)`
                  : `Number of skins: ${skinTotals.total}`
              }
            />
          )}

          <SkinsResultsView
            tableMode={tableMode}
            flatMode={flatMode}
            rows={rows}
            flatSkins={flatSkins}
            listResetKey={listResetKey}
            presentation={presentation}
          />
        </Stack>
      </Box>

      <CardFilterDrawer showFoils={false} />

      <MarketActionDialogHost
        state={resolvedDialogState}
        assetName="SKINS"
        account={selectedAccount}
        onClose={() => setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </Box>
  );
}
