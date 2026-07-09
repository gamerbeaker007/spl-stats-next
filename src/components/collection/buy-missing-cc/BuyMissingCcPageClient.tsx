"use client";

import BuyCardDialog from "@/components/collection/buy-card-dialog/BuyCardDialog";
import BuyMissingCcFilterDrawer from "@/components/collection/buy-missing-cc/BuyMissingCcFilterDrawer";
import BuyMissingCcTable from "@/components/collection/buy-missing-cc/BuyMissingCcTable";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBuyMissingCcSharedData } from "@/hooks/cards/useBuyMissingCcSharedData";
import { getBuyMissingCcDetailedCollectionAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useBuyMissingCcFilter } from "@/lib/frontend/context/BuyMissingCcFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  calculateUpgradeCostEstimate,
  calculateUpgradeRequirements,
  getCardMaxLevel,
  getCombineRatesForCard,
} from "@/lib/shared/buy-missing-cc";
import { matchesCardFilter, type FilterableCard } from "@/lib/shared/card-filter-utils";
import { toCardFoil } from "@/lib/shared/card-utils";
import { getBracketLevelRange, LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import type { League } from "@/types/buy-missing-cc";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import {
  Alert,
  Box,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import BracketFilter from "./BracketFilter";
import type {
  AccountCardState,
  BracketTableState,
  BuyMissingCcSortField,
  DisplayRow,
  Row,
} from "./types";
import { bracketStatus } from "./utils";

const COLLECTION_STICKY_BAR_HEIGHT = 58;

export default function BuyMissingCcPageClient() {
  const isMobile = useMediaQuery("(max-width:899px)");
  const { addItems } = usePurchasePlan();
  const { filter } = useBuyMissingCcFilter();
  const {
    cardDetails,
    settings,
    loading: sharedLoading,
    error: sharedError,
  } = useBuyMissingCcSharedData();

  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccounts();

  const [addAccountInput, setAddAccountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [sortBy, setSortBy] = useState<BuyMissingCcSortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selectedBracket, setSelectedBracket] = useState<League | "">("");
  const [bracketStateFilters, setBracketStateFilters] = useState<BracketTableState[]>(["all"]);
  const [search, setSearch] = useState("");
  const [dialogRow, setDialogRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!selectedBracket) {
      setBracketStateFilters(["all"]);
    }
  }, [selectedBracket]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!selectedAccount) {
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (sharedLoading) {
          return;
        }

        if (sharedError) {
          setError(sharedError);
          return;
        }

        if (!settings || cardDetails.length === 0) {
          return;
        }

        const snapshot = await getBuyMissingCcDetailedCollectionAction(selectedAccount);
        if (!active) return;

        const collectionItems = Object.values(snapshot.detailedCollection);
        const byKey: Record<string, AccountCardState> = {};

        for (const item of collectionItems) {
          for (const card of item.allCards ?? []) {
            const foil = card.foil;
            const key = `${card.id}-${card.edition}-${foil}`;
            const current = byKey[key] ?? { highestLevel: 0, highestCc: 0, totalCc: 0 };
            const level = card.level ?? 0;

            if (level > current.highestLevel) {
              current.highestLevel = level;
              current.highestCc = card.bcx ?? 0;
            } else if (level === current.highestLevel) {
              current.highestCc = Math.max(current.highestCc, card.bcx ?? 0);
            }

            current.totalCc += card.bcx ?? 0;
            byKey[key] = current;
          }
        }

        const groupedPriceByKey = new Map<string, number>();
        for (const market of snapshot.groupedMarket) {
          const foil = toCardFoil(market.foil);
          const key = `${market.card_detail_id}-${foil}`;
          const existing = groupedPriceByKey.get(key);
          const nextPrice = Number(market.low_price_bcx);
          if (Number.isFinite(nextPrice) && nextPrice > 0) {
            groupedPriceByKey.set(key, existing ? Math.min(existing, nextPrice) : nextPrice);
          }
        }

        const nextRows: Row[] = [];
        for (const item of collectionItems) {
          if (item.edition === 16) continue;

          for (const foil of item.availableFoils) {
            const key = `${item.cardDetailId}-${item.edition}-${foil}`;
            const priceKey = `${item.cardDetailId}-${foil}`;
            const accountStates: Record<string, AccountCardState> = {
              [selectedAccount]: byKey[key] ?? {
                highestLevel: 0,
                highestCc: 0,
                totalCc: 0,
              },
            };

            const card: DetailedPlayerCardCollectionItem = {
              cardDetailId: item.cardDetailId,
              name: item.name,
              edition: item.edition,
              tier: item.tier,
              rarity: item.rarity,
              color: item.color,
              secondaryColor: item.secondaryColor,
              role: item.role,
              availableFoils: item.availableFoils,
              cardStats: item.cardStats,
            };

            nextRows.push({
              key,
              ...card,
              foil,
              accountStates,
              lowPricePerBcxUsd: groupedPriceByKey.get(priceKey) ?? null,
            });
          }
        }

        setRows(nextRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Buy Missing CC data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [cardDetails, selectedAccount, settings, sharedError, sharedLoading]);

  const isLoading = loading || sharedLoading;

  const displayRows = useMemo<DisplayRow[]>(() => {
    return rows.map((row) => {
      const state = (selectedAccount && row.accountStates[selectedAccount]) || {
        highestLevel: 0,
        highestCc: 0,
        totalCc: 0,
      };

      return {
        ...row,
        highestOwnedLevel: state.highestLevel,
        highestOwnedCc: state.highestCc,
        totalOwnedCc: state.totalCc,
      };
    });
  }, [rows, selectedAccount]);

  const filteredRows = useMemo(() => {
    return displayRows.filter((row) => {
      const pseudo: FilterableCard = {
        edition: row.edition,
        tier: row.tier,
        rarity: row.rarity,
        color: (row.color ?? "gray").toLowerCase(),
        secondaryColor: row.secondaryColor?.toLowerCase(),
        role: row.role,
      };

      if (!matchesCardFilter(pseudo, filter)) return false;
      if (filter.foilCategories.length > 0 && !filter.foilCategories.includes(row.foil)) {
        return false;
      }
      if (search && !row.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (!selectedBracket) return true;

      if (bracketStateFilters.includes("all") || bracketStateFilters.length === 0) {
        return true;
      }

      const status = bracketStatus(row.highestOwnedLevel, selectedBracket, row.rarity);
      const mapped: Exclude<BracketTableState, "all"> =
        status === "below-bracket" ? "below" : status;

      return bracketStateFilters.includes(mapped);
    });
  }, [displayRows, filter, search, selectedBracket, bracketStateFilters]);

  const summary = useMemo(() => {
    let toMaxUsd = 0;
    let toBracketUsd = 0;

    for (const row of filteredRows) {
      if (!settings) continue;
      const rates = getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier);
      if (!rates) continue;

      const maxLevel = getCardMaxLevel(rates);
      const maxReq = calculateUpgradeRequirements(row.totalOwnedCc, maxLevel, rates);
      const maxCost = calculateUpgradeCostEstimate(maxReq.missingCc, row.lowPricePerBcxUsd);
      toMaxUsd += maxCost.usd;

      if (selectedBracket) {
        const [, bracketMax] = getBracketLevelRange(selectedBracket, row.rarity);
        const targetLevel = Math.min(bracketMax, maxLevel);
        const bracketReq = calculateUpgradeRequirements(row.totalOwnedCc, targetLevel, rates);
        const bracketCost = calculateUpgradeCostEstimate(
          bracketReq.missingCc,
          row.lowPricePerBcxUsd
        );
        toBracketUsd += bracketCost.usd;
      }
    }

    return { toMaxUsd, toBracketUsd };
  }, [filteredRows, selectedBracket, settings]);

  function toggleSort(field: BuyMissingCcSortField) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  }

  function handleBracketStateChange(next: BracketTableState[]) {
    if (!Array.isArray(next) || next.length === 0) {
      setBracketStateFilters(["all"]);
      return;
    }

    let normalized = next;
    if (next.includes("all") && next.length > 1) {
      normalized = next.filter((entry) => entry !== "all");
    }

    setBracketStateFilters(normalized.length > 0 ? normalized : ["all"]);
  }

  function handleAddAccount() {
    const next = addAccountInput.trim();
    if (!next) return;
    addLocalAccount(next);
    setAddAccountInput("");
  }

  return (
    <Box display="flex" gap={2}>
      <Box flex={1} minWidth={0}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h4">Buy Missing CC</Typography>

          <AccountSelectorBar
            accounts={accountOptions}
            selectedAccount={selectedAccount}
            onSelectedAccountChange={setSelectedAccount}
            addAccountInput={addAccountInput}
            onAddAccountInputChange={setAddAccountInput}
            onAddAccount={handleAddAccount}
            onRemoveSelected={() => removeLocalAccount(selectedAccount)}
            removeDisabled={!selectedAccount || monitoredAccounts.includes(selectedAccount)}
            extraContent={
              <TextField
                size="small"
                label="Search card"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: 220 }}
              />
            }
          />

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <BracketFilter
              selectedBracket={selectedBracket}
              setSelectedBracket={setSelectedBracket}
            />

            {selectedBracket && (
              <ToggleButtonGroup
                value={bracketStateFilters}
                onChange={(_event, value: BracketTableState[]) => handleBracketStateChange(value)}
                size="small"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="below">Below Bracket</ToggleButton>
                <ToggleButton value="in-bracket">In Bracket</ToggleButton>
                <ToggleButton value="max">Max for Bracket</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Chip label={`Estimated to Max: $${summary.toMaxUsd.toFixed(2)}`} />
            {selectedBracket && (
              <Chip
                color="primary"
                label={`Estimated ${LEAGUE_BRACKETS[selectedBracket].label}: $${summary.toBracketUsd.toFixed(2)}`}
              />
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Estimate formula: (Required CC - Current CC) x Lowest $/CC.
          </Typography>
        </Stack>

        <BuyMissingCcTable
          rows={filteredRows}
          settings={settings ?? null}
          selectedBracket={selectedBracket}
          sortBy={sortBy}
          sortDir={sortDir}
          toggleSort={toggleSort}
          isLoading={isLoading}
          canBuy={Boolean(selectedAccount)}
          onOpenBuyDialog={(row) => setDialogRow(row)}
        />
      </Box>

      <BuyMissingCcFilterDrawer />

      {dialogRow && settings && selectedAccount && (
        <BuyCardDialog
          open={Boolean(dialogRow)}
          mode="target-level"
          account={selectedAccount}
          card={dialogRow}
          initialFoilSelection={dialogRow.foil}
          settings={settings}
          initialTargetBracket={selectedBracket || undefined}
          selectableAccounts={accountOptions}
          topOffsetPx={isMobile ? undefined : APP_BAR_HEIGHT + COLLECTION_STICKY_BAR_HEIGHT}
          onClose={() => setDialogRow(null)}
          onAddToPurchasePlan={(items) => {
            addItems(items);
          }}
        />
      )}
    </Box>
  );
}
