"use client";

import { CardFilterDrawer } from "@/components/collection/cards/CardFilterDrawer";
import SkinActionDialog from "@/components/collection/skins/SkinActionDialog";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { useMarketplaceSkinsPageData } from "@/hooks/collection/useMarketplaceSkinsPageData";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type {
  MarketplaceAssetPrice,
  MarketplaceSkinGroup,
  MarketplaceSkinItem,
} from "@/types/marketplace-assets";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { MdInfoOutline } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";

type DialogState = {
  mode: "buy" | "transfer" | "list";
  skin: MarketplaceSkinItem;
  defaultListPriceUsd: number | null;
} | null;

interface SkinGroupViewModel {
  group: MarketplaceSkinGroup;
  card: DetailedPlayerCardCollectionItem | null;
  totalOwnedCards: number;
  totalOwnedSkins: number;
  totalListedSkins: number;
}

function chooseRepresentativeCard(
  skins: MarketplaceSkinItem[],
  cardCandidates: DetailedPlayerCardCollectionItem[]
): DetailedPlayerCardCollectionItem | null {
  if (cardCandidates.length === 0) return null;

  const preferredEditions = skins.flatMap((skin) => [
    skin.imageCardEditionId,
    ...skin.cardEditionIds,
  ]);
  return (
    cardCandidates.find((candidate) => preferredEditions.includes(candidate.edition)) ??
    cardCandidates[0]
  );
}

function formatPriceLabel(skin: MarketplaceSkinItem): string {
  const labels = skin.prices
    .filter((entry) => Number.isFinite(entry.minPrice) && entry.minPrice > 0)
    .map((entry) => `${entry.minPrice.toFixed(2)} ${entry.currency}`);

  return labels.length > 0 ? labels.join(" / ") : "No active listings";
}

function getLowestUsdPrice(prices: MarketplaceAssetPrice[]): number | null {
  const usdPrices = prices
    .filter(
      (entry) => entry.currency === "USD" && Number.isFinite(entry.minPrice) && entry.minPrice > 0
    )
    .map((entry) => entry.minPrice);

  if (usdPrices.length === 0) return null;
  return Math.min(...usdPrices);
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
  const { filter } = useCardFilter();

  const [addAccountInput, setAddAccountInput] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedSkinSet, setSelectedSkinSet] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>(null);

  const { data, loading, error } = useMarketplaceSkinsPageData(
    selectedAccount,
    collectionRefreshVersion
  );

  const skinSets = useMemo(() => {
    return Array.from(
      new Set((data?.groups ?? []).flatMap((group) => group.skins.map((skin) => skin.skinSet)))
    ).sort();
  }, [data?.groups]);

  const rows = useMemo<SkinGroupViewModel[]>(() => {
    const detailedCollection = data?.detailedCollection ?? {};

    const groupedRows = (data?.groups ?? []).map((group) => {
      const cardCandidates = Object.values(detailedCollection).filter(
        (entry) => entry.cardDetailId === group.cardDetailId
      );
      const card = chooseRepresentativeCard(group.skins, cardCandidates);
      const totalOwnedCards = cardCandidates.reduce(
        (sum, entry) => sum + (entry.allCards?.length ?? 0),
        0
      );
      const totalOwnedSkins = group.skins.reduce((sum, skin) => sum + skin.numOwned, 0);
      const totalListedSkins = group.skins.reduce((sum, skin) => sum + skin.numListed, 0);

      return {
        group,
        card,
        totalOwnedCards,
        totalOwnedSkins,
        totalListedSkins,
      };
    });

    return groupedRows
      .filter((row) => {
        if (selectedSkinSet && row.group.skins.every((skin) => skin.skinSet !== selectedSkinSet)) {
          return false;
        }

        if (!row.card) return true;
        return matchesCardFilter(row.card, filter);
      })
      .sort((left, right) => left.group.baseCardName.localeCompare(right.group.baseCardName));
  }, [data?.detailedCollection, data?.groups, filter, selectedSkinSet]);

  const handleCompleted = () => {
    notifyBalancesRefresh();
    notifyCollectionRefresh();
  };

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

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "center" }}
              >
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
                  label="Select skin group"
                  labelPlacement="start"
                />
              </Stack>
            </Stack>
          </Box>

          {loading && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: 160 }}
            >
              <CircularProgress size={22} />
              <Typography>Loading marketplace skins...</Typography>
            </Stack>
          )}

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && rows.length === 0 && (
            <Alert severity="info">No skin data matches the selected filters.</Alert>
          )}

          <Stack spacing={3}>
            {rows.map((row) => {
              const cardEdition = row.card?.highestLevelCard?.edition ?? row.card?.edition ?? 1;
              const cardFoil = row.card?.highestLevelCard?.foil ?? "regular";
              const cardLevel = row.card?.highestLevelCard?.level ?? 1;
              const cardHeight = 360;

              if (filter.hideMissingCards && row.totalOwnedCards < 1) {
                return null;
              }

              return (
                <Box key={`${row.group.cardDetailId}-${row.group.baseCardName}`}>
                  <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={{ xs: 2, lg: 3 }}
                    alignItems="stretch"
                  >
                    <Stack
                      spacing={1.25}
                      alignItems="center"
                      sx={{ width: { xs: "100%", lg: 240 }, minHeight: cardHeight }}
                    >
                      <Typography variant="h6" align="center" sx={{ width: "100%" }}>
                        {row.group.baseCardName}
                      </Typography>

                      <Box
                        component="img"
                        src={
                          row.card
                            ? getCardImageByLevel(row.card.name, cardEdition, cardFoil, cardLevel)
                            : (row.group.skins[0]?.image ?? "")
                        }
                        alt={row.group.baseCardName}
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
                    <Divider sx={{ display: { xs: "block", lg: "none" }, borderColor: "red" }} />

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                      }}
                    >
                      {row.group.skins.map((skin) => {
                        // Do not show skins that are not part of the selected skin set (if one is selected)
                        if (
                          (selectedSkinSet && skin.skinSet !== selectedSkinSet) ||
                          (ownedOnly && skin.numOwned < 1)
                        ) {
                          return null;
                        }

                        return (
                          <Stack
                            key={skin.detailId}
                            spacing={1.25}
                            flex="1"
                            sx={{
                              minHeight: cardHeight,
                              maxWidth: 230,
                              width: "100%",
                            }}
                          >
                            <Box sx={{ width: "100%" }}>
                              <Typography variant="subtitle1" align="center" noWrap>
                                {skin.skinSet}
                              </Typography>
                            </Box>

                            <Box
                              component="img"
                              src={skin.image ?? ""}
                              alt={skin.displayName}
                              sx={{
                                width: "100%",
                                maxWidth: 210,
                                height: 220,
                                objectFit: "contain",
                                opacity: skin.numOwned > 0 ? 1 : 0.5,
                              }}
                            />

                            <Stack spacing={0.5} alignItems="center">
                              <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                flexWrap="wrap"
                                justifyContent="center"
                              >
                                <Chip
                                  label={
                                    skin.numOwned > 0 ? `Owned x${skin.numOwned}` : "Not owned"
                                  }
                                  color={skin.numOwned > 0 ? "success" : "default"}
                                  size="small"
                                />
                                <Chip
                                  label={
                                    skin.numListed > 0 ? `Listed x${skin.numListed}` : "No listings"
                                  }
                                  color={skin.numListed > 0 ? "warning" : "default"}
                                  size="small"
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Lowest Price: {formatPriceLabel(skin)}
                              </Typography>
                            </Stack>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} width="100%">
                              <Button
                                variant="outlined"
                                size="small"
                                title="Buy"
                                disabled={skin.numListed === 0}
                                onClick={() =>
                                  setDialogState({
                                    mode: "buy",
                                    skin,
                                    defaultListPriceUsd: getLowestUsdPrice(skin.prices),
                                  })
                                }
                                fullWidth
                              >
                                <FaTag style={{ width: "1.25rem", height: "1.25rem" }} />
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                title="Transfer"
                                disabled={skin.numOwned === 0}
                                onClick={() =>
                                  setDialogState({
                                    mode: "transfer",
                                    skin,
                                    defaultListPriceUsd: getLowestUsdPrice(skin.prices),
                                  })
                                }
                                fullWidth
                              >
                                <IoMdSend style={{ width: "1.25rem", height: "1.25rem" }} />
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                title="List"
                                disabled={skin.numOwned === 0}
                                onClick={() =>
                                  setDialogState({
                                    mode: "list",
                                    skin,
                                    defaultListPriceUsd: getLowestUsdPrice(skin.prices),
                                  })
                                }
                                fullWidth
                              >
                                <SiHomeassistantcommunitystore
                                  style={{ width: "1.25rem", height: "1.25rem" }}
                                />
                              </Button>
                            </Stack>
                          </Stack>
                        );
                      })}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Stack>
      </Box>

      <CardFilterDrawer showFoils={false} />

      <SkinActionDialog
        open={Boolean(dialogState)}
        mode={dialogState?.mode ?? "buy"}
        account={selectedAccount}
        skin={dialogState?.skin ?? null}
        defaultListPriceUsd={dialogState?.defaultListPriceUsd ?? null}
        onClose={() => setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </Box>
  );
}
