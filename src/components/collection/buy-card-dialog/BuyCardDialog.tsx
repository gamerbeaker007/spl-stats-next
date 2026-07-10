"use client";

import BracketFilter from "@/components/collection/buy-missing-cc/BracketFilter";
import { useMarketListings } from "@/hooks/cards/useMarketListings";
import {
  getBuyCardDialogAccountContextAction,
  getBuyCardDialogSharedContextAction,
} from "@/lib/backend/actions/buy-missing-cc-actions";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { checkoutItems } from "@/lib/frontend/purchase/checkout";
import {
  buildPurchasePlan,
  calculateUpgradeRequirements,
  getCardFirstPlayableLevel,
  getCombineRatesForCard,
  selectCheapestListings,
} from "@/lib/shared/buy-missing-cc";
import { broadcastCombineCards } from "@/lib/frontend/purchase/splBroadcast";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { getFoilLabel } from "@/lib/shared/card-utils";
import {
  getCardSetIconUrl,
  getCardSetLabel,
  getEditionIconUrl,
  getEditionLabel,
} from "@/lib/shared/edition-utils";
import { getBracketLevelRange, LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import { credits_icon_url, dec_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import type { League } from "@/types/buy-missing-cc";
import {
  CardFoil,
  cardFoilOptions,
  CardRarity,
  DetailedPlayerCardCollectionItem,
} from "@/types/card";
import type { PurchaseCurrency, PurchasePlanItem } from "@/types/purchase/purchase-plan";
import type { CardStats } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CardDetailsSummary from "./CardDetailsSummary";
import ManualListingsTabContent from "./ManualListingsTabContent";
import PurchaseTxProgressPanel from "./PurchaseTxProgressPanel";
import TargetLevelTabContent, { type TargetLevelRow } from "./TargetLevelTabContent";

export type BuyCardDialogMode = "manual-listings" | "target-level";

type AccountCardState = {
  highestLevel: number;
  highestCc: number;
  totalCc: number;
};

export interface BuyCardDialogProps {
  open: boolean;
  mode: BuyCardDialogMode;
  account: string;
  card: DetailedPlayerCardCollectionItem;
  initialFoilSelection: CardFoil;
  currentLevel?: number;
  currentCc?: number;
  settings?: SplSettings;
  initialTargetBracket?: League;
  selectableAccounts?: string[];
  accountStates?: Record<string, AccountCardState>;
  accountBalances?: Record<string, { DEC: number; CREDITS: number }>;
  topOffsetPx?: number;
  onClose: () => void;
  onAddToPurchasePlan: (items: PurchasePlanItem[]) => void;
}

const PAGE_OPTIONS = [20, 50, 100] as const;
const BRACKET_ORDER: League[] = ["wood", "bronze", "silver", "gold", "diamond", "champion"];

function getPlayableBrackets(level: number, rarity: CardRarity): League[] {
  return BRACKET_ORDER.filter((bracket) => {
    const [min, max] = getBracketLevelRange(bracket, rarity);
    return level >= min && level <= max;
  });
}

function isMaxOnlyFoil(foil: CardFoil): boolean {
  return foil === "gold arcane" || foil === "black" || foil === "black arcane";
}

function cumulativeAbilities(abilitiesByLevel: string[] | string[][], level: number): string[] {
  const unlocked = new Set<string>();

  // Archons: ["Flying", "Recharge"]
  if (abilitiesByLevel.length > 0 && typeof abilitiesByLevel[0] === "string") {
    for (const ability of abilitiesByLevel as string[]) {
      if (ability) unlocked.add(ability);
    }
    return Array.from(unlocked);
  }

  // Units: [["Flying"], ["Flying", "Recharge"], ...]
  const perLevel = abilitiesByLevel as string[][];
  for (let i = 0; i < level; i += 1) {
    const abilities = perLevel[i] ?? [];
    for (const ability of abilities) {
      if (ability) unlocked.add(ability);
    }
  }

  return Array.from(unlocked);
}

export default function BuyCardDialog({
  open,
  mode,
  account,
  card,
  initialFoilSelection,
  currentLevel,
  currentCc,
  settings,
  initialTargetBracket,
  selectableAccounts,
  accountStates,
  accountBalances,
  topOffsetPx,
  onClose,
  onAddToPurchasePlan,
}: Readonly<BuyCardDialogProps>) {
  const { cardDetailId, name, edition, rarity, tier, role, cardStats } = card;
  const { rows, loading, error, fetchRows } = useMarketListings();
  const {
    items: cartItems,
    removeItem,
    removeMany,
    notifyBalancesRefresh,
    notifyCollectionRefresh,
    collectionRefreshVersion,
  } = usePurchasePlan();

  const [activeMode, setActiveMode] = useState<BuyCardDialogMode>(mode);
  const [targetBracket, setTargetBracket] = useState<League | "">(initialTargetBracket || "");
  const [selectedAccount, setSelectedAccount] = useState(account.toLowerCase());
  const [selectedFoil, setSelectedFoil] = useState<CardFoil>(initialFoilSelection);
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_OPTIONS)[number]>(20);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shiftAnchorIndex, setShiftAnchorIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<
    "level" | "cc" | "priceUsd" | "priceDec" | "priceCredits" | "pricePerCcDec"
  >("priceDec");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [buyBusy, setBuyBusy] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [resolvedSettings, setResolvedSettings] = useState<SplSettings | null>(settings ?? null);
  const [dynamicAccountStates, setDynamicAccountStates] = useState<
    Record<string, AccountCardState>
  >(accountStates ?? {});
  const [dynamicBalances, setDynamicBalances] = useState<
    Record<string, { DEC: number; CREDITS: number }>
  >(accountBalances ?? {});
  const [txProgress, setTxProgress] = useState<{
    submitted: boolean;
    processed: boolean;
    txId?: string;
    error?: string;
  } | null>(null);
  const [dynamicCardUids, setDynamicCardUids] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedAccount(account.toLowerCase());
    setSelectedFoil(initialFoilSelection);
    setActiveMode(mode);
    setTargetBracket(initialTargetBracket || "");
    setContextError(null);
    setResolvedSettings(settings ?? null);
    setDynamicAccountStates(accountStates ?? {});
    setDynamicBalances(accountBalances ?? {});
  }, [
    account,
    accountBalances,
    accountStates,
    initialFoilSelection,
    initialTargetBracket,
    mode,
    open,
    settings,
  ]);

  useEffect(() => {
    if (!open) return;
    if (settings) setResolvedSettings(settings);
    if (accountStates) setDynamicAccountStates((prev) => ({ ...prev, ...accountStates }));
    if (accountBalances) setDynamicBalances((prev) => ({ ...prev, ...accountBalances }));
  }, [accountBalances, accountStates, rarity, role, cardStats, tier, open, settings]);

  useEffect(() => {
    if (!open) return;

    if (resolvedSettings) {
      return;
    }

    let active = true;

    async function loadSharedContext() {
      try {
        const context = await getBuyCardDialogSharedContextAction(cardDetailId);
        if (!active) return;

        setResolvedSettings(context.settings);
      } catch (err) {
        if (!active) return;
        setContextError(
          err instanceof Error ? err.message : "Failed to load card context for target-level tab"
        );
      }
    }

    loadSharedContext();

    return () => {
      active = false;
    };
  }, [cardDetailId, open, resolvedSettings]);

  useEffect(() => {
    if (!open || !selectedAccount) return;

    let active = true;

    async function loadAccountContext() {
      setContextLoading(true);
      try {
        const context = await getBuyCardDialogAccountContextAction(
          selectedAccount,
          cardDetailId,
          edition,
          selectedFoil
        );

        if (!active) return;

        setDynamicAccountStates((prev) => ({
          ...prev,
          [context.account]: context.accountState,
        }));

        setDynamicBalances((prev) => ({
          ...prev,
          [context.account]: context.balance,
        }));
        setDynamicCardUids(context.cardUids);
      } catch (err) {
        if (!active) return;
        setContextError(
          err instanceof Error
            ? err.message
            : "Failed to load selected account balances and ownership"
        );
      } finally {
        if (active) setContextLoading(false);
      }
    }

    loadAccountContext();

    return () => {
      active = false;
    };
  }, [cardDetailId, edition, open, selectedAccount, selectedFoil, collectionRefreshVersion]);

  useEffect(() => {
    if (!open) return;
    fetchRows({
      cardDetailId,
      edition,
      foil: selectedFoil,
      type: "buy",
    });
  }, [cardDetailId, edition, fetchRows, open, selectedFoil, collectionRefreshVersion]);

  useEffect(() => {
    setSelectedIds([]);
    setShiftAnchorIndex(null);
    setPage(1);
  }, [selectedFoil, levelFilter, pageSize, selectedAccount, activeMode]);

  const listingLevels = useMemo(
    () => Array.from(new Set(rows.map((row) => row.level))).sort((a, b) => a - b),
    [rows]
  );

  const manualRows = useMemo(() => {
    if (levelFilter === "all") return rows;
    return rows.filter((row) => row.level === levelFilter);
  }, [levelFilter, rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...manualRows];
    sorted.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      const delta = Number(av) - Number(bv);
      return sortDir === "asc" ? delta : -delta;
    });
    return sorted;
  }, [manualRows, sortBy, sortDir]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [page, pageSize, sortedRows]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  const inCartSet = useMemo(
    () =>
      new Set(
        cartItems
          .filter((item) => item.account.toLowerCase() === selectedAccount)
          .map((item) => item.marketId)
      ),
    [cartItems, selectedAccount]
  );

  const reservedByOtherAccountSet = useMemo(
    () =>
      new Set(
        cartItems
          .filter((item) => item.account.toLowerCase() !== selectedAccount)
          .map((item) => item.marketId)
      ),
    [cartItems, selectedAccount]
  );

  const selectedRows = useMemo(
    () => sortedRows.filter((row) => selectedIds.includes(row.marketId)),
    [selectedIds, sortedRows]
  );

  const selectionTotals = useMemo(() => {
    return selectedRows.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.cc += row.cc;
        acc.usd += row.priceUsd;
        acc.dec += row.priceDec;
        acc.credits += row.priceCredits ?? 0;
        return acc;
      },
      { count: 0, cc: 0, usd: 0, dec: 0, credits: 0 }
    );
  }, [selectedRows]);

  function toPurchaseItem(row: (typeof selectedRows)[number]): PurchasePlanItem {
    return {
      account: selectedAccount,
      marketId: row.marketId,
      uid: row.uid,
      cardDetailId,
      cardName: name,
      edition: row.edition,
      foil: row.foil,
      level: row.level,
      cc: row.cc,
      priceUsd: row.priceUsd,
      priceDec: row.priceDec,
      priceCredits: row.priceCredits ?? 0,
      seller: row.seller,
    };
  }

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  function toggleCartByButton(clickedGlobalIndex: number, shiftKey: boolean) {
    const clicked = sortedRows[clickedGlobalIndex];
    if (!clicked) return;

    const clickedInCart = inCartSet.has(clicked.marketId);
    const shouldAdd = !clickedInCart;
    const reservedByOther = reservedByOtherAccountSet.has(clicked.marketId);

    if (shouldAdd && reservedByOther) {
      return;
    }

    const applySingle = () => {
      if (shouldAdd) {
        onAddToPurchasePlan([toPurchaseItem(clicked)]);
        setSelectedIds((prev) =>
          prev.includes(clicked.marketId) ? prev : [...prev, clicked.marketId]
        );
      } else {
        removeItem(selectedAccount, clicked.marketId);
        setSelectedIds((prev) => prev.filter((id) => id !== clicked.marketId));
      }
    };

    if (!shiftKey || shiftAnchorIndex === null) {
      applySingle();
      setShiftAnchorIndex(clickedGlobalIndex);
      return;
    }

    const start = Math.min(shiftAnchorIndex, clickedGlobalIndex);
    const end = Math.max(shiftAnchorIndex, clickedGlobalIndex);
    const rangeRows = sortedRows.slice(start, end + 1);

    if (shouldAdd) {
      const eligibleRangeRows = rangeRows.filter(
        (row) => !reservedByOtherAccountSet.has(row.marketId)
      );
      const toAdd = eligibleRangeRows
        .filter((row) => !inCartSet.has(row.marketId))
        .map(toPurchaseItem);
      if (toAdd.length > 0) onAddToPurchasePlan(toAdd);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const row of eligibleRangeRows) next.add(row.marketId);
        return Array.from(next);
      });
    } else {
      for (const row of rangeRows) {
        if (inCartSet.has(row.marketId)) {
          removeItem(selectedAccount, row.marketId);
        }
      }
      setSelectedIds((prev) => prev.filter((id) => !rangeRows.some((row) => row.marketId === id)));
    }
    setShiftAnchorIndex(clickedGlobalIndex);
  }

  const selectedItems: PurchasePlanItem[] = selectedRows.map(toPurchaseItem);

  const accountState = dynamicAccountStates[selectedAccount] ?? {
    highestLevel: Math.max(0, currentLevel ?? 0),
    highestCc: Math.max(0, currentCc ?? 0),
    totalCc: Math.max(0, currentCc ?? 0),
  };
  const balance = dynamicBalances[selectedAccount] ?? { DEC: 0, CREDITS: 0 };

  const canAffordDec = selectionTotals.dec <= balance.DEC;
  const canAffordCredits = selectionTotals.credits <= balance.CREDITS;

  const combineRates = useMemo(() => {
    if (!resolvedSettings) return null;
    return getCombineRatesForCard(resolvedSettings, edition, selectedFoil, rarity, tier);
  }, [resolvedSettings, edition, selectedFoil, rarity, tier]);

  const numberOfLevels = combineRates?.length ?? 0;
  const isHighestCcAtMaxLevel =
    accountState.highestLevel > 0 && accountState.highestLevel >= numberOfLevels;

  const dynamicStats = useMemo(() => {
    if (!cardStats) return [] as Array<{ key: keyof CardStats; label: string }>;
    const candidates: Array<{ key: keyof CardStats; label: string }> = [
      { key: "health", label: "Health" },
      { key: "armor", label: "Armor" },
      { key: "speed", label: "Speed" },
      { key: "attack", label: "Melee" },
      { key: "ranged", label: "Ranged" },
      { key: "magic", label: "Magic" },
    ];
    return candidates.filter((row) => {
      const values = cardStats[row.key];
      return Array.isArray(values) && values.some((value) => Number(value) > 0);
    });
  }, [cardStats]);

  const targetRows = useMemo(() => {
    if (!combineRates || !cardStats) return [] as TargetLevelRow[];

    const maxOnlyFoil = isMaxOnlyFoil(selectedFoil);
    const numberOfLevels = combineRates.length;
    const firstPlayableLevel = getCardFirstPlayableLevel(combineRates);
    const firstTargetableLevel = maxOnlyFoil ? numberOfLevels : firstPlayableLevel;

    return Array.from({ length: numberOfLevels }, (_, idx): TargetLevelRow => {
      const level = idx + 1;
      const isTargetable = level >= firstTargetableLevel;
      const statsLevel = isTargetable ? level : firstTargetableLevel;

      if (!isTargetable) {
        return {
          level,
          statsLevel,
          playableBrackets: getPlayableBrackets(statsLevel, rarity),
          targetCc: null,
          ownedBcx: accountState.totalCc,
          neededBcx: null,
          dec: 0,
          credits: 0,
          usd: 0,
          planItems: [],
          fulfilled: false,
          isTargetable: false,
          abilities: cumulativeAbilities(cardStats?.abilities ?? [], statsLevel),
        };
      }

      const req = calculateUpgradeRequirements(accountState.totalCc, level, combineRates);
      const selection = selectCheapestListings(rows, req.missingCc);
      const plan = buildPurchasePlan({
        account: selectedAccount,
        cardName: name,
        listings: selection.selected,
      });

      return {
        level,
        statsLevel,
        playableBrackets: getPlayableBrackets(statsLevel, rarity),
        targetCc: req.targetCc,
        ownedBcx: accountState.totalCc,
        neededBcx: req.missingCc,
        dec: plan.totals.dec,
        credits: plan.items.reduce((sum, item) => sum + item.priceCredits, 0),
        usd: plan.totals.usd,
        planItems: plan.items,
        fulfilled: selection.fulfilled || req.missingCc === 0,
        isTargetable: true,
        abilities: cumulativeAbilities(cardStats?.abilities ?? [], statsLevel),
      };
    });
  }, [
    accountState.totalCc,
    name,
    combineRates,
    rarity,
    cardStats,
    rows,
    selectedAccount,
    selectedFoil,
  ]);

  async function handleCombineAtLevel() {
    if (dynamicCardUids.length === 0) {
      setContextError("No card UIDs available for combine. Try refreshing.");
      return;
    }

    setBuyBusy(true);
    setTxProgress(null);
    try {
      const txId = await broadcastCombineCards({
        account: selectedAccount,
        cardUids: dynamicCardUids,
      });
      setTxProgress({ submitted: true, processed: true, txId });
      notifyBalancesRefresh();
      notifyCollectionRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Combine failed";
      setTxProgress({ submitted: false, processed: false, error: message });
    } finally {
      setBuyBusy(false);
    }
  }

  async function runCheckoutForPlan(items: PurchasePlanItem[], currency: PurchaseCurrency) {
    if (items.length === 0) return;

    setBuyBusy(true);
    setTxProgress(null);
    try {
      const result = await checkoutItems(items, currency, {
        onBroadcast: ({ txId }) => setTxProgress({ submitted: true, processed: false, txId }),
        onVerified: ({ txId, success, message }) => {
          setTxProgress({
            submitted: true,
            processed: success,
            txId,
            error: success ? undefined : message,
          });
        },
      });

      if (result.successfulItems.length > 0) {
        removeMany(result.successfulItems);
        notifyBalancesRefresh();
        notifyCollectionRefresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      setTxProgress({ submitted: false, processed: false, error: message });
    } finally {
      setBuyBusy(false);
    }
  }

  async function buySelected(currency: PurchaseCurrency) {
    await runCheckoutForPlan(selectedItems, currency);
  }

  const titleSetIcon = getCardSetIconUrl(edition, tier);
  const titleSetLabel = getCardSetLabel(edition, tier);
  const titleEditionIcon = getEditionIconUrl(edition);
  const titleEditionLabel = getEditionLabel(edition) ?? `Edition ${edition}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      sx={{
        mt: `${topOffsetPx ?? 0}px`,
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h6">CC - {name}</Typography>
          {titleSetIcon && (
            <Image src={titleSetIcon} alt={titleSetLabel ?? "Set"} width={24} height={24} />
          )}
          {titleEditionIcon && (
            <Image src={titleEditionIcon} alt={titleEditionLabel} width={24} height={24} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Tabs
            value={activeMode}
            onChange={(_event, value: BuyCardDialogMode) => setActiveMode(value)}
          >
            <Tab value="target-level" label="Target Level" />
            <Tab value="manual-listings" label="Manual Listings" />
          </Tabs>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <Image
              src={getCardImageByLevel(
                name,
                edition,
                selectedFoil,
                Math.max(1, accountState.highestLevel)
              )}
              alt={name}
              width={100}
              height={160}
              style={{ objectFit: "contain" }}
            />

            <Stack spacing={1}>
              <CardDetailsSummary card={card} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <Typography variant="body2">Current Level: {accountState.highestLevel}</Typography>
                <Typography
                  variant="body2"
                  sx={
                    isHighestCcAtMaxLevel ? { color: "success.main", fontWeight: 700 } : undefined
                  }
                >
                  Owned BCX: {accountState.highestCc}
                </Typography>
              </Stack>
              {activeMode === "target-level" && rarity && targetBracket !== "" && (
                <Typography variant="body2" color="error.main">
                  Target: {LEAGUE_BRACKETS[targetBracket].label} (
                  {getBracketLevelRange(targetBracket, rarity)[0]}-
                  {getBracketLevelRange(targetBracket, rarity)[1]})
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Account</InputLabel>
                  <Select
                    label="Account"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(String(e.target.value))}
                  >
                    {(selectableAccounts && selectableAccounts.length > 0
                      ? selectableAccounts
                      : [selectedAccount]
                    ).map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Foil</InputLabel>
                  <Select
                    label="Foil"
                    value={selectedFoil}
                    onChange={(e) => setSelectedFoil(e.target.value)}
                  >
                    {cardFoilOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {getFoilLabel(option)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {activeMode === "target-level" && rarity && (
                  <BracketFilter
                    selectedBracket={targetBracket}
                    setSelectedBracket={setTargetBracket}
                  />
                )}
              </Box>
            </Stack>
          </Box>

          {(error || contextError) && <Alert severity="error">{error ?? contextError}</Alert>}
          {contextLoading && (
            <Alert severity="info">Refreshing account balances and ownership...</Alert>
          )}

          {activeMode === "target-level" ? (
            <TargetLevelTabContent
              combineRatesAvailable={Boolean(combineRates)}
              dynamicStats={dynamicStats}
              targetRows={targetRows}
              cardStats={cardStats}
              rarity={rarity}
              targetBracket={targetBracket}
              accountHighestLevel={accountState.highestLevel}
              accountTotalCc={accountState.totalCc}
              isHighestCcAtMaxLevel={isHighestCcAtMaxLevel}
              buyBusy={buyBusy}
              balance={balance}
              onAddToPurchasePlan={onAddToPurchasePlan}
              onRunCheckoutForPlan={runCheckoutForPlan}
              onCombineAtLevel={
                dynamicCardUids.length > 0 && combineRates ? handleCombineAtLevel : undefined
              }
            />
          ) : (
            <ManualListingsTabContent
              listingLevels={listingLevels}
              levelFilter={levelFilter}
              setLevelFilter={setLevelFilter}
              pageSize={pageSize}
              setPageSize={setPageSize}
              pageOptions={PAGE_OPTIONS}
              sortBy={sortBy}
              sortDir={sortDir}
              toggleSort={toggleSort}
              pagedRows={pagedRows}
              loading={loading}
              selectedIds={selectedIds}
              inCartSet={inCartSet}
              reservedByOtherAccountSet={reservedByOtherAccountSet}
              page={page}
              pageCount={pageCount}
              setPage={setPage}
              toggleCartByButton={toggleCartByButton}
              selectionTotals={selectionTotals}
            />
          )}

          <PurchaseTxProgressPanel buyBusy={buyBusy} txProgress={txProgress} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", mr: 2 }}>
          <Typography variant="body2">Balance ({account}):</Typography>
          <Avatar src={dec_icon_url} alt="DEC" sx={{ width: 16, height: 16 }} />
          <Typography variant="body2">{largeNumberFormat(balance.DEC)}</Typography>
          <Divider orientation="vertical" flexItem />
          <Avatar src={credits_icon_url} alt="CREDITS" sx={{ width: 16, height: 16 }} />
          <Typography variant="body2">{largeNumberFormat(balance.CREDITS)}</Typography>
        </Stack>

        <Button onClick={onClose}>Close</Button>

        {activeMode === "manual-listings" && (
          <>
            <Tooltip
              title={
                !canAffordDec && selectedItems.length > 0
                  ? `Insufficient DEC (${selectionTotals.dec.toFixed(3)} required)`
                  : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  onClick={() => buySelected("DEC")}
                  disabled={buyBusy || selectedItems.length === 0 || !canAffordDec}
                >
                  {buyBusy ? "Processing..." : "Buy with DEC"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canAffordCredits && selectedItems.length > 0
                  ? `Insufficient Credits (${selectionTotals.credits.toFixed(0)} required)`
                  : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  onClick={() => buySelected("CREDITS")}
                  disabled={buyBusy || selectedItems.length === 0 || !canAffordCredits}
                >
                  {buyBusy ? "Processing..." : "Buy with Credits"}
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
