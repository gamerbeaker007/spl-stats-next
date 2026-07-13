"use client";

import { CardFilterDrawer } from "@/components/collection/cards/CardFilterDrawer";
import MarketActionDialogHost, {
  type MarketActionMode,
  type MarketActionState,
} from "@/components/collection/marketplace/MarketActionDialogHost";
import MarketAssetCard from "@/components/collection/marketplace/MarketAssetCard";
import MarketFilterBar from "@/components/collection/marketplace/MarketFilterBar";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { LoadingSpinnerOverlay } from "@/components/ui/LoadingSpinnerOverlay";
import { useMarketplaceAssetsPageData } from "@/hooks/collection/useMarketplaceAssetsPageData";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import {
  applyMarketAssetFilters,
  DEFAULT_MARKET_ASSET_FILTER,
  getLowestUsdPrice,
  type MarketAssetFilter,
} from "@/lib/shared/marketplace-assets";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type { MarketplaceAssetGroup, MarketplaceAssetItem } from "@/types/marketplace-assets";
import {
  Alert,
  Box,
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
import { MdGridView, MdInfoOutline, MdViewAgenda } from "react-icons/md";

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

export default function SkinsPageClient() {
  const { collectionRefreshVersion, notifyBalancesRefresh, notifyCollectionRefresh } =
    usePurchasePlan();
  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccounts();
  const { filter: cardFilter } = useCardFilter();

  const [addAccountInput, setAddAccountInput] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedSkinSet, setSelectedSkinSet] = useState("");
  const [marketFilter, setMarketFilter] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [viewMode, setViewMode] = useState<SkinViewMode>("grouped");
  const [dialogState, setDialogState] = useState<MarketActionState | null>(null);

  const { data, loading, error } = useMarketplaceAssetsPageData(
    selectedAccount,
    "SKINS",
    collectionRefreshVersion
  );

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
          if (ownedOnly && skin.numOwned < 1) return false;
          return true;
        });

        return {
          group,
          card,
          visibleSkins: applyMarketAssetFilters(setOwnedSkins, marketFilter),
          totalOwnedCards,
          totalOwnedSkins: group.items.reduce((sum, skin) => sum + skin.numOwned, 0),
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

  // Flat skin list used when a listing filter is active (no base card).
  const flatSkins = useMemo(() => {
    const base = (data?.groups ?? [])
      .flatMap((group) => group.items)
      .filter((skin) => {
        if (selectedSkinSet && skin.setName !== selectedSkinSet) return false;
        if (ownedOnly && skin.numOwned < 1) return false;
        return true;
      });
    return applyMarketAssetFilters(base, marketFilter);
  }, [data?.groups, selectedSkinSet, ownedOnly, marketFilter]);

  const handleAction = (mode: MarketActionMode, item: MarketplaceAssetItem) => {
    setDialogState({ mode, item, defaultListPriceUsd: getLowestUsdPrice(item.prices) });
  };

  const handleCompleted = async () => {
    await revalidateTagsAction([
      { type: "marketplace", usernames: [selectedAccount] },
      { type: "balances", usernames: [selectedAccount] },
    ]);
    notifyBalancesRefresh();
    notifyCollectionRefresh();
  };

  const isEmpty = flatMode ? flatSkins.length === 0 : rows.length === 0;

  return (
    <Box display="flex" flex={1}>
      <Box flex={1}>
        <Stack spacing={2.5}>
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
              <AccountSelectorBar
                accounts={accountOptions}
                selectedAccount={selectedAccount}
                onSelectedAccountChange={setSelectedAccount}
                addAccountInput={addAccountInput}
                onAddAccountInputChange={setAddAccountInput}
                onAddAccount={() => {
                  addLocalAccount(addAccountInput);
                  setAddAccountInput("");
                }}
                onRemoveSelected={() => removeLocalAccount(selectedAccount)}
                removeDisabled={!selectedAccount || monitoredAccounts.includes(selectedAccount)}
              />

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
              </Stack>
            </Stack>
          </Box>

          <LoadingSpinnerOverlay loading={loading} message="Loading marketplace skins..." />

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && isEmpty && (
            <Alert severity="info">No skin data matches the selected filters.</Alert>
          )}

          {/* Flat mode — only skin cards, no base card. */}
          {flatMode ? (
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

                return (
                  <Box key={`${row.group.cardDetailId}-${row.group.groupName}`}>
                    <Stack
                      direction={{ xs: "column", lg: "row" }}
                      spacing={{ xs: 2, lg: 3 }}
                      alignItems="stretch"
                    >
                      {/* Base card column — omitted entirely when there is no card for this row. */}
                      {row.card ? (
                        <>
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
                              src={getCardImageByLevel(
                                row.card.name,
                                cardEdition,
                                cardFoil,
                                cardLevel
                              )}
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
                          </Stack>
                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{ display: { xs: "none", lg: "block" }, borderColor: "divider" }}
                          />
                        </>
                      ) : (
                        <Typography variant="h6">{row.group.groupName}</Typography>
                      )}

                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {row.visibleSkins.map((skin) => (
                          <MarketAssetCard
                            key={skin.detailId}
                            item={skin}
                            onAction={handleAction}
                          />
                        ))}
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
        state={dialogState}
        assetName="SKINS"
        account={selectedAccount}
        onClose={() => setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </Box>
  );
}
