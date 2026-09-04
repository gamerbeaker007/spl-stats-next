"use client";

import { CardFilterDrawer } from "@/components/collection/cards/CardFilterDrawer";
import MarketActionDialogHost, {
  type MarketActionMode,
  type MarketActionState,
} from "@/components/collection/marketplace/MarketActionDialogHost";
import MarketAssetCard from "@/components/collection/marketplace/MarketAssetCard";
import MarketAssetTable from "@/components/collection/marketplace/MarketAssetTable";
import MarketFilterBar from "@/components/collection/marketplace/MarketFilterBar";
import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import { LoadingSpinnerOverlay } from "@/components/ui/LoadingSpinnerOverlay";
import { useMarketplaceAssetsPageData } from "@/hooks/collection/useMarketplaceAssetsPageData";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import {
  applyMarketAssetFilters,
  DEFAULT_MARKET_ASSET_FILTER,
  DEFAULT_SKIN_DISPLAY_NAME,
  DEFAULT_SKIN_NAME,
  getActualOwnedQuantity,
  getLowestUsdPrice,
  isSkinActive,
  type MarketAssetFilter,
} from "@/lib/shared/marketplace-assets";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type { MarketplaceAssetGroup, MarketplaceAssetItem } from "@/types/marketplace-assets";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { MdCheckCircle, MdGridView, MdInfoOutline, MdViewAgenda } from "react-icons/md";

type SkinViewMode = "grouped" | "flat";

interface SkinGroupViewModel {
  group: MarketplaceAssetGroup;
  card: DetailedPlayerCardCollectionItem | null;
  visibleSkins: MarketplaceAssetItem[];
  totalOwnedCards: number;
  totalOwnedSkins: number;
}

function chooseRepresentativeCard(
  skins: MarketplaceAssetItem[],
  cardCandidates: DetailedPlayerCardCollectionItem[]
): DetailedPlayerCardCollectionItem | null {
  if (cardCandidates.length === 0) return null;

  const preferredEditions = new Set(
    skins.flatMap((skin) => [skin.imageCardEditionId, ...skin.cardEditionIds])
  );
  return (
    cardCandidates.find((candidate) => preferredEditions.has(candidate.edition)) ??
    cardCandidates[0]
  );
}

function buildBaseSkinItem(args: {
  cardDetailId: number;
  groupName: string;
  image: string;
  active: boolean;
}): MarketplaceAssetItem {
  const detailId = `base:${args.cardDetailId}`;

  return {
    assetName: "SKINS",
    detailId,
    detailIdNumber: args.cardDetailId,
    itemId: detailId,
    displayName: DEFAULT_SKIN_DISPLAY_NAME,
    groupName: args.groupName,
    setName: DEFAULT_SKIN_NAME,
    image: args.image,
    icon: null,
    filterIcon: null,
    description: "",
    rarity: null,
    numCirculation: 0,
    ownedQuantity: 1,
    actualOwned: 1,
    currentlyListed: 0,
    availableToList: 0,
    numOwned: 1,
    numListed: 0,
    prices: [],
    cardDetailId: args.cardDetailId,
    cardEditionIds: [],
    imageCardEditionId: null,
    active: args.active,
    baseSkin: true,
    activationSkinName: DEFAULT_SKIN_NAME,
  };
}

export default function SkinsPageClient() {
  const { collectionRefreshVersion, notifyBalancesRefresh, notifyCollectionRefresh } =
    usePurchasePlan();
  const { selectedAccount } = useAccounts();
  const { filter: cardFilter } = useCardFilter();
  const { viewMode: layoutMode } = useMarketplaceView();

  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedSkinSet, setSelectedSkinSet] = useState("");
  const [marketFilter, setMarketFilter] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [viewMode, setViewMode] = useState<SkinViewMode>("grouped");
  const [dialogState, setDialogState] = useState<MarketActionState | null>(null);

  const {
    data,
    loading,
    error,
    refresh: refreshMarketplaceData,
  } = useMarketplaceAssetsPageData(selectedAccount, "SKINS", collectionRefreshVersion);

  // Grouped shows base card + its skins; flat shows only skin cards.
  const flatMode = viewMode === "flat";

  const skinSets = useMemo(
    () =>
      Array.from(
        new Set((data?.groups ?? []).flatMap((group) => group.items.map((skin) => skin.setName)))
      ).sort(),
    [data?.groups]
  );

  // Grouped (default) rows: base card + its skins.
  const rows = useMemo<SkinGroupViewModel[]>(() => {
    const detailedCollection = data?.detailedCollection ?? {};

    return (data?.groups ?? [])
      .map((group) => {
        const cardCandidates = Object.values(detailedCollection).filter(
          (entry) => entry.cardDetailId === group.cardDetailId
        );
        const card = chooseRepresentativeCard(group.items, cardCandidates);
        const totalOwnedCards = cardCandidates.reduce(
          (sum, entry) => sum + (entry.allCards?.length ?? 0),
          0
        );

        const setOwnedSkins = group.items.filter((skin) => {
          if (selectedSkinSet && skin.setName !== selectedSkinSet) return false;
          if (ownedOnly && getActualOwnedQuantity(skin) < 1) return false;
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
        if (cardFilter.hideMissingCards && row.totalOwnedCards < 1) return false;
        return true;
      })
      .sort((left, right) => left.group.groupName.localeCompare(right.group.groupName));
  }, [
    data?.detailedCollection,
    data?.groups,
    cardFilter,
    selectedSkinSet,
    ownedOnly,
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

  const handleAction = (mode: MarketActionMode, item: MarketplaceAssetItem) => {
    setDialogState({ mode, item, defaultListPriceUsd: getLowestUsdPrice(item.prices) });
  };

  const resolvedDialogState = useMemo<MarketActionState | null>(() => {
    if (!dialogState) return null;

    if (dialogState.item.baseSkin) {
      const cardDetailId = dialogState.item.cardDetailId;
      const group =
        cardDetailId !== null
          ? data?.groups.find((entry) => entry.cardDetailId === cardDetailId)
          : undefined;
      if (!group) return dialogState;

      const cardCandidates = Object.values(data?.detailedCollection ?? {}).filter(
        (entry) => entry.cardDetailId === group.cardDetailId
      );
      const card = chooseRepresentativeCard(group.items, cardCandidates);
      const cardEdition = card?.highestLevelCard?.edition ?? card?.edition ?? 1;
      const cardFoil = card?.highestLevelCard?.foil ?? "regular";
      const cardLevel = card?.highestLevelCard?.level ?? 1;
      const baseCardImage = getCardImageByLevel(
        card?.name ?? group.groupName,
        cardEdition,
        cardFoil,
        cardLevel
      );

      return {
        ...dialogState,
        item: buildBaseSkinItem({
          cardDetailId: group.cardDetailId,
          groupName: group.groupName,
          image: baseCardImage,
          active: !group.items.some(isSkinActive),
        }),
      };
    }

    const currentItem =
      data?.groups
        .flatMap((group) => group.items)
        .find((item) => item.detailId === dialogState.item.detailId) ?? dialogState.item;
    return { ...dialogState, item: currentItem };
  }, [data?.detailedCollection, data?.groups, dialogState]);

  const handleCompleted = async () => {
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
  const tableMode = layoutMode === "table";
  const isEmpty = tableMode || flatMode ? flatSkins.length === 0 : rows.length === 0;

  return (
    <Box display="flex" flex={1}>
      <Box flex={1}>
        <Stack spacing={2.5}>
          <MarketplaceAccountBar />

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "background.paper",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={ownedOnly}
                      onChange={(_event, checked) => setOwnedOnly(checked)}
                    />
                  }
                  label="Owned skins only"
                />
                <Tooltip title="Only show cards where the selected account owns at least one skin.">
                  <Box sx={{ display: "inline-flex" }}>
                    <MdInfoOutline size={18} />
                  </Box>
                </Tooltip>
                <FormControlLabel
                  control={
                    <Select
                      size="small"
                      value={selectedSkinSet}
                      onChange={(event) => setSelectedSkinSet(event.target.value)}
                      sx={{ minWidth: 160 }}
                    >
                      <MenuItem value="">All skin sets</MenuItem>
                      {skinSets.map((skinSet) => (
                        <MenuItem key={skinSet} value={skinSet}>
                          {skinSet}
                        </MenuItem>
                      ))}
                    </Select>
                  }
                  label="Skin set"
                  labelPlacement="start"
                />
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <MarketFilterBar filter={marketFilter} onChange={setMarketFilter} />
                {/* Hidden while reloading: the hook keeps the previous account's
                    data, and a stale exact number misleads more than a missing one. */}
                {data && !loading && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      selectedAccount
                        ? `Number of skins: ${skinTotals.total} (${skinTotals.owned} owned)`
                        : `Number of skins: ${skinTotals.total}`
                    }
                  />
                )}
                {/* Grouped/flat only applies to the card layout. */}
                {!tableMode && (
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={viewMode}
                    onChange={(_event, value: SkinViewMode | null) => {
                      if (value) setViewMode(value);
                    }}
                  >
                    <ToggleButton value="grouped" aria-label="Grouped by card">
                      <Tooltip title="Group by base card">
                        <MdViewAgenda size={18} />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="flat" aria-label="Flat skin grid">
                      <Tooltip title="Show skins only (no base card)">
                        <MdGridView size={18} />
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              </Stack>
            </Stack>
          </Box>

          <LoadingSpinnerOverlay loading={loading} message="Loading marketplace skins..." />

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && isEmpty && (
            <Alert severity="info">No skin data matches the selected filters.</Alert>
          )}

          {/* Table layout — flat rows, no base card. */}
          {tableMode ? (
            <MarketAssetTable items={flatSkins} onAction={handleAction} />
          ) : flatMode ? (
            /* Flat card mode — only skin cards, no base card. */
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {flatSkins.map((skin) => (
                <MarketAssetCard key={skin.detailId} item={skin} onAction={handleAction} />
              ))}
            </Box>
          ) : (
            <Stack spacing={3}>
              {rows.map((row) => {
                const cardEdition = row.card?.highestLevelCard?.edition ?? row.card?.edition ?? 1;
                const cardFoil = row.card?.highestLevelCard?.foil ?? "regular";
                const cardLevel = row.card?.highestLevelCard?.level ?? 1;
                const baseCardImage = getCardImageByLevel(
                  row.card?.name ?? row.group.groupName,
                  cardEdition,
                  cardFoil,
                  cardLevel
                );
                const baseSkinActive = !row.group.items.some(isSkinActive);
                const baseSkinItem = buildBaseSkinItem({
                  cardDetailId: row.group.cardDetailId,
                  groupName: row.group.groupName,
                  image: baseCardImage,
                  active: baseSkinActive,
                });

                return (
                  <Box key={`${row.group.cardDetailId}-${row.group.groupName}`}>
                    <Stack
                      direction={{ xs: "column", lg: "row" }}
                      spacing={{ xs: 2, lg: 3 }}
                      alignItems="stretch"
                    >
                      {/* Base card column — omitted entirely when there is no card for this row. */}
                      {row.card ? (
                        <Box
                          sx={{
                            borderRadius: 2,
                            border: baseSkinActive ? 2 : 1,
                            borderColor: baseSkinActive ? "success.main" : "divider",
                            backgroundColor: "background.paper",
                            boxShadow: baseSkinActive
                              ? "0 0 0 1px rgba(76, 175, 80, 0.15)"
                              : "none",
                          }}
                        >
                          <Stack
                            spacing={1.25}
                            alignItems="center"
                            sx={{ width: { xs: "100%", lg: 240 } }}
                          >
                            <Typography variant="h6" align="center" sx={{ width: "100%" }}>
                              {row.group.groupName}
                            </Typography>
                            <Box
                              component="img"
                              src={baseCardImage}
                              alt={row.group.groupName}
                              sx={{
                                width: "100%",
                                maxWidth: 210,
                                height: 220,
                                objectFit: "contain",
                                opacity: row.totalOwnedCards > 0 ? 1 : 0.5,
                              }}
                            />
                            <Stack
                              direction="row"
                              spacing={1}
                              useFlexGap
                              flexWrap="wrap"
                              justifyContent="center"
                            >
                              <Chip label={`${row.totalOwnedCards} cards`} size="small" />
                              <Chip
                                label={`${row.totalOwnedSkins} skins owned`}
                                color={row.totalOwnedSkins > 0 ? "success" : "default"}
                                size="small"
                              />
                            </Stack>
                            <Button
                              variant="outlined"
                              size="small"
                              title="List"
                              color={baseSkinActive ? "warning" : "primary"}
                              disabled={baseSkinActive}
                              onClick={() => handleAction("activate", baseSkinItem)}
                            >
                              <MdCheckCircle style={{ width: "150px", height: "1.1rem" }} />
                            </Button>
                          </Stack>
                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{ display: { xs: "none", lg: "block" }, borderColor: "divider" }}
                          />
                        </Box>
                      ) : (
                        <Typography variant="h6">{row.group.groupName}</Typography>
                      )}

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {row.visibleSkins.map((skin) => {
                          return (
                            <MarketAssetCard
                              key={skin.detailId}
                              item={skin}
                              onAction={handleAction}
                            />
                          );
                        })}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
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
