"use client";

import BuyCardDialog from "@/components/collection/buy-card-dialog/BuyCardDialog";
import BuyMissingCcFilterDrawer from "@/components/collection/buy-missing-cc/BuyMissingCcFilterDrawer";
import BuyMissingCcTable from "@/components/collection/buy-missing-cc/BuyMissingCcTable";
import CombineCardsDialog from "@/components/collection/combine-card-dialog/CombineCardsDialog";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useBuyMissingCcSharedData } from "@/hooks/cards/useBuyMissingCcSharedData";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getBuyMissingCcDetailedCollectionAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { useBuyMissingCcFilter } from "@/lib/frontend/context/BuyMissingCcFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  calculateUpgradeCostEstimate,
  calculateUpgradeRequirements,
  getCardMaxLevel,
  getCombinableLevels,
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
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdInfoOutline, MdRefresh } from "react-icons/md";
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
// Vertical chrome above the page content on desktop: app bar (paddingTop) +
// collection sticky sub-bar + <main> margins (10 top / 10 bottom) + page Box pb:3 (24).
const FILL_HEIGHT_OFFSET_PX = APP_BAR_HEIGHT + COLLECTION_STICKY_BAR_HEIGHT + 44;
const FOIL_RANK: Record<Row["foil"], number> = {
  regular: 1,
  gold: 2,
  "gold arcane": 3,
  black: 4,
  "black arcane": 5,
};

export default function BuyMissingCcPageClient() {
  const isMobile = useMediaQuery("(max-width:899px)");
  const { addItems, collectionRefreshVersion, notifyCollectionRefresh } = usePurchasePlan();
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
    savedAccounts,
  } = useAccounts();

  const [addAccountInput, setAddAccountInput] = useState("");
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHardRefresh = useCallback(async () => {
    if (refreshCooldown || !selectedAccount) return;
    setRefreshCooldown(true);
    await revalidateTagsAction([{ type: "collection", usernames: [selectedAccount] }]);
    notifyCollectionRefresh();
    cooldownTimerRef.current = setTimeout(() => setRefreshCooldown(false), 60_000);
  }, [refreshCooldown, selectedAccount, notifyCollectionRefresh]);

  useEffect(
    () => () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    },
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [sortBy, setSortBy] = useState<BuyMissingCcSortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selectedBracket, setSelectedBracket] = useState<League | "">("");
  const [bracketStateFilters, setBracketStateFilters] = useState<BracketTableState[]>(["all"]);
  const [combineFoils, setCombineFoils] = useState(false);
  const [highestLevelOnly, setHighestLevelOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogRow, setDialogRow] = useState<DisplayRow | null>(null);
  const [combineDialogRow, setCombineDialogRow] = useState<DisplayRow | null>(null);
  const [showUpgradeableOnly, setShowUpgradeableOnly] = useState(false);

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

        const groupedPriceByKey = new Map<string, { lowPrice: number; lowPriceBcx: number }>();
        for (const market of snapshot.groupedMarket) {
          const key = `${market.card_detail_id}-${toCardFoil(market.foil)}`;

          const prices = groupedPriceByKey.get(key) ?? {
            lowPrice: Number.POSITIVE_INFINITY,
            lowPriceBcx: Number.POSITIVE_INFINITY,
          };

          const lowPriceBcx = Number(market.low_price_bcx);
          if (Number.isFinite(lowPriceBcx) && lowPriceBcx > 0) {
            prices.lowPriceBcx = Math.min(prices.lowPriceBcx, lowPriceBcx);
          }

          const lowPrice = Number(market.low_price);
          if (Number.isFinite(lowPrice) && lowPrice > 0) {
            prices.lowPrice = Math.min(prices.lowPrice, lowPrice);
          }

          groupedPriceByKey.set(key, prices);
        }

        // Optional: convert "not found" values back to 0 if needed
        for (const prices of groupedPriceByKey.values()) {
          if (!Number.isFinite(prices.lowPrice)) prices.lowPrice = 0;
          if (!Number.isFinite(prices.lowPriceBcx)) prices.lowPriceBcx = 0;
        }

        const nextRows: Row[] = [];
        for (const item of collectionItems) {
          if (item.edition === 16) continue; //skip soulbound foundation

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
              allCards: item.allCards,
            };

            nextRows.push({
              key,
              ...card,
              foil,
              accountStates,
              lowPricePerBcxUsd: groupedPriceByKey.get(priceKey)?.lowPriceBcx ?? null,
              lowPriceUsd: groupedPriceByKey.get(priceKey)?.lowPrice ?? null,
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
  }, [
    cardDetails,
    selectedAccount,
    settings,
    sharedError,
    sharedLoading,
    collectionRefreshVersion,
  ]);

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

  const displayRowsWithCrossFoilProgress = useMemo<DisplayRow[]>(() => {
    if (!combineFoils) {
      return displayRows;
    }

    const grouped = new Map<string, DisplayRow[]>();
    for (const row of displayRows) {
      const key = `${row.cardDetailId}-${row.edition}-${row.tier}`;
      const list = grouped.get(key) ?? [];
      list.push(row);
      grouped.set(key, list);
    }

    const mergedRows: DisplayRow[] = [];

    for (const groupRows of grouped.values()) {
      if (groupRows.length === 0) continue;
      const ownedRows = groupRows.filter((row) => row.totalOwnedCc > 0);

      if (ownedRows.length === 0) {
        // Missing card: `availableFoils` comes from the API in arbitrary order, so
        // picking the first match would surface a random (often premium) foil.
        // Prefer the cheapest foil instead — lowest foil rank, i.e. regular first.
        const candidates = filter.foilCategories.length
          ? groupRows.filter((row) => filter.foilCategories.includes(row.foil))
          : groupRows;
        const fallbackRow =
          [...(candidates.length > 0 ? candidates : groupRows)].sort(
            (a, b) => FOIL_RANK[a.foil] - FOIL_RANK[b.foil]
          )[0] ?? groupRows[0];
        mergedRows.push({
          ...fallbackRow,
          key: `${fallbackRow.key}-cross-foil-missing`,
        });
        continue;
      }

      const sortedOwnedRows = [...ownedRows].sort((a, b) => FOIL_RANK[b.foil] - FOIL_RANK[a.foil]);
      if (highestLevelOnly) {
        // Pick the foil whose highest owned copy has the highest level.
        // Tie-break by highest owned CC, then by foil rank.
        const highestRow = [...ownedRows].sort((a, b) => {
          if (b.highestOwnedLevel !== a.highestOwnedLevel) {
            return b.highestOwnedLevel - a.highestOwnedLevel;
          }
          if (b.highestOwnedCc !== a.highestOwnedCc) {
            return b.highestOwnedCc - a.highestOwnedCc;
          }
          return FOIL_RANK[b.foil] - FOIL_RANK[a.foil];
        })[0];
        mergedRows.push({
          ...highestRow,
          key: `${highestRow.key}-cross-foil-highest`,
        });
        continue;
      }

      for (const ownedRow of sortedOwnedRows) {
        mergedRows.push({
          ...ownedRow,
          key: `${ownedRow.key}-cross-foil-owned`,
        });
      }
    }

    return mergedRows;
  }, [combineFoils, displayRows, filter.foilCategories, highestLevelOnly]);

  const filteredRows = useMemo(() => {
    return displayRowsWithCrossFoilProgress.filter((row) => {
      const pseudo: FilterableCard = {
        edition: row.edition,
        tier: row.tier,
        rarity: row.rarity,
        color: (row.color ?? "gray").toLowerCase(),
        secondaryColor: row.secondaryColor?.toLowerCase(),
        role: row.role,
      };

      if (!matchesCardFilter(pseudo, filter)) return false;
      const isOwnedCard = row.totalOwnedCc > 0;
      const shouldApplyFoilFilter = !combineFoils || !isOwnedCard;
      if (
        shouldApplyFoilFilter &&
        filter.foilCategories.length > 0 &&
        !filter.foilCategories.includes(row.foil)
      ) {
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
  }, [
    displayRowsWithCrossFoilProgress,
    filter,
    search,
    selectedBracket,
    bracketStateFilters,
    combineFoils,
  ]);

  const upgradeableFilteredRows = useMemo(() => {
    if (!showUpgradeableOnly || !settings) return filteredRows;

    return filteredRows.filter((row) => {
      const rates = getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier);
      if (!rates) return false;

      // Upgradeable filter is BCX-based only: include cards that can reach at least
      // one higher level, regardless of temporary combine restrictions.
      const combinableLevels = getCombinableLevels({
        combineRates: rates,
        currentLevel: row.highestOwnedLevel,
        totalOwnedCc: row.totalOwnedCc,
        allCards:
          row.allCards?.filter((card) => card.edition === row.edition && card.foil === row.foil) ??
          [],
      });
      return combinableLevels.length > 0;
    });
  }, [filteredRows, settings, showUpgradeableOnly]);

  const summary = useMemo(() => {
    let toMaxUsd = 0;
    let toBracketUsd = 0;

    for (const row of upgradeableFilteredRows) {
      if (!settings) continue;
      const rates = getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier);
      if (!rates) continue;

      const maxLevel = getCardMaxLevel(rates);
      const maxReq = calculateUpgradeRequirements(row.totalOwnedCc, maxLevel, rates);
      const maxCost = calculateUpgradeCostEstimate(maxReq.missingCc, row.lowPriceUsd);
      toMaxUsd += maxCost.usd;

      if (selectedBracket) {
        const [, bracketMax] = getBracketLevelRange(selectedBracket, row.rarity);
        const targetLevel = Math.min(bracketMax, maxLevel);
        const bracketReq = calculateUpgradeRequirements(row.totalOwnedCc, targetLevel, rates);
        const bracketCost = calculateUpgradeCostEstimate(bracketReq.missingCc, row.lowPriceUsd);
        toBracketUsd += bracketCost.usd;
      }
    }

    return { toMaxUsd, toBracketUsd };
  }, [selectedBracket, settings, upgradeableFilteredRows]);

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

    // User just clicked "All" (it wasn't selected before) → collapse to only "all".
    if (next.includes("all") && !bracketStateFilters.includes("all")) {
      setBracketStateFilters(["all"]);
      return;
    }

    // Otherwise a specific bracket is active — drop "all" if it lingers.
    const normalized = next.filter((entry) => entry !== "all");
    setBracketStateFilters(normalized.length > 0 ? normalized : ["all"]);
  }

  function handleAddAccount() {
    const next = addAccountInput.trim();
    if (!next) return;
    addLocalAccount(next);
    setAddAccountInput("");
  }

  return (
    <Box display="flex" gap={2} alignItems="flex-start">
      <Box
        flex={1}
        minWidth={0}
        sx={{
          display: { md: "flex" },
          flexDirection: { md: "column" },
          height: { md: `calc(100vh - ${FILL_HEIGHT_OFFSET_PX}px)` },
          minHeight: { md: 0 },
        }}
      >
        <Stack spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
          <Typography variant="h4">Buy Missing CC</Typography>

          <AccountSelectorBar
            accounts={accountOptions}
            selectedAccount={selectedAccount}
            onSelectedAccountChange={setSelectedAccount}
            addAccountInput={addAccountInput}
            onAddAccountInputChange={setAddAccountInput}
            onAddAccount={handleAddAccount}
            monitoredAccounts={monitoredAccounts}
            localAccounts={savedAccounts}
            onRemoveAccount={removeLocalAccount}
            extraContent={
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  label="Search card"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: 220 }}
                />
                <Tooltip
                  title={
                    refreshCooldown ? "Refresh available in ~60s" : "Force refresh collection data"
                  }
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MdRefresh />}
                      disabled={refreshCooldown || !selectedAccount}
                      onClick={handleHardRefresh}
                    >
                      Refresh
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
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

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={combineFoils}
                    onChange={(_event, checked) => setCombineFoils(checked)}
                  />
                }
                label="Cross-Foil Progress"
              />
              <Tooltip title="Cross-Foil Progress ignores foil filter for cards you own and evaluates progress using owned foil data. Unowned cards still follow your selected foil filter.">
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <MdInfoOutline size={16} />
                </IconButton>
              </Tooltip>
            </Stack>

            <FormControlLabel
              sx={{ ml: 0 }}
              disabled={!combineFoils}
              control={
                <Switch
                  size="small"
                  checked={highestLevelOnly}
                  onChange={(_event, checked) => setHighestLevelOnly(checked)}
                />
              }
              label="Highest Level Only"
            />

            <FormControlLabel
              sx={{ ml: 0 }}
              control={
                <Switch
                  size="small"
                  checked={showUpgradeableOnly}
                  onChange={(_event, checked) => setShowUpgradeableOnly(checked)}
                />
              }
              label="Upgradeable Cards"
            />
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
            Estimate formula: (Required CC - Current CC) x Lowest Price for 1 CC.
          </Typography>
        </Stack>

        <BuyMissingCcTable
          rows={upgradeableFilteredRows}
          settings={settings ?? null}
          selectedBracket={selectedBracket}
          sortBy={sortBy}
          sortDir={sortDir}
          toggleSort={toggleSort}
          isLoading={isLoading}
          onOpenBuyDialog={(row) => setDialogRow(row)}
          onOpenCombineDialog={(row) => setCombineDialogRow(row)}
          fillHeight
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

      {combineDialogRow && settings && selectedAccount && (
        <CombineCardsDialog
          open={Boolean(combineDialogRow)}
          account={selectedAccount}
          card={combineDialogRow}
          combineRates={
            getCombineRatesForCard(
              settings,
              combineDialogRow.edition,
              combineDialogRow.foil,
              combineDialogRow.rarity,
              combineDialogRow.tier
            ) ?? undefined
          }
          topOffsetPx={isMobile ? undefined : APP_BAR_HEIGHT + COLLECTION_STICKY_BAR_HEIGHT}
          onClose={() => setCombineDialogRow(null)}
          onSuccess={async () => {
            // Bust the cached collection BEFORE bumping the refresh version,
            // otherwise the reload re-reads the same pre-combine `"use cache"`
            // snapshot and the combine status recomputes to the identical state.
            await revalidateTagsAction([
              { type: "collection", usernames: [selectedAccount] },
              { type: "balances", usernames: [selectedAccount] },
            ]);
            // Bump the shared refresh version so the collection reloads (the load
            // effect depends on collectionRefreshVersion).
            notifyCollectionRefresh();
          }}
        />
      )}
    </Box>
  );
}
