"use client";

import CurrencyAmountChip from "@/components/cards/top-bar/CurrencyAmountChip";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import { useMarketListings } from "@/hooks/cards/useMarketListings";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { checkoutItems } from "@/lib/frontend/purchase/checkout";
import {
  buildPurchasePlan,
  calculateUpgradeRequirements,
  getCombineRatesForCard,
  selectCheapestListings,
} from "@/lib/shared/buy-missing-cc";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { abilityIconUrl } from "@/lib/shared/card-utils";
import { getBracketLevelRange, LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import { credits_icon_url, dec_icon_url, WEB_URL } from "@/lib/staticsIconUrls";
import { findLeagueLogoUrl } from "@/lib/utils";
import type { LeagueBracket } from "@/types/buy-missing-cc";
import { CardFoil } from "@/types/card";
import type { PurchaseCurrency, PurchasePlanItem } from "@/types/purchase/purchase-plan";
import type { CardStats } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import BracketFilter from "../buy-missing-cc/BracketFilter";
import ManualSelectionTotalsBar from "./ManualSelectionTotalsBar";
import PurchaseTxProgressPanel from "./PurchaseTxProgressPanel";

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
  cardDetailId: number;
  cardName: string;
  edition: number;
  foil: number;
  currentLevel?: number;
  currentCc?: number;
  cardRarity?: number;
  cardTier?: number | null;
  cardStats?: CardStats;
  settings?: SplSettings;
  initialTargetBracket?: LeagueBracket;
  selectableAccounts?: string[];
  accountStates?: Record<string, AccountCardState>;
  accountBalances?: Record<string, { DEC: number; CREDITS: number }>;
  canBuy: boolean;
  onClose: () => void;
  onAddToPurchasePlan: (items: PurchasePlanItem[]) => void;
}

const PAGE_OPTIONS = [20, 50, 100] as const;
const BRACKET_ORDER: LeagueBracket[] = ["wood", "bronze", "silver", "gold", "diamond", "champion"];
const BRACKET_LOGO_LEAGUE: Record<LeagueBracket, number> = {
  wood: 0,
  bronze: 3,
  silver: 6,
  gold: 9,
  diamond: 12,
  champion: 15,
};

function levelBracket(level: number, rarity: number): LeagueBracket {
  for (const bracket of BRACKET_ORDER) {
    const [, max] = getBracketLevelRange(bracket, rarity);
    if (level <= max) return bracket;
  }
  return "champion";
}

const STAT_ICON_URL: Record<Exclude<keyof CardStats, "abilities">, string> = {
  mana: `${WEB_URL}website/icons/icon_mana.svg`,
  attack: `${WEB_URL}website/stats/2.0/128/melee.webp`,
  ranged: `${WEB_URL}website/stats/2.0/128/ranged.webp`,
  magic: `${WEB_URL}website/stats/2.0/128/magic.webp`,
  armor: `${WEB_URL}website/stats/2.0/128/armor.webp`,
  health: `${WEB_URL}website/stats/2.0/128/health.webp`,
  speed: `${WEB_URL}website/stats/2.0/128/speed.webp`,
};

function playableBrackets(level: number, rarity: number): LeagueBracket[] {
  return BRACKET_ORDER.filter((bracket) => {
    const [min, max] = getBracketLevelRange(bracket, rarity);
    return level >= min && level <= max;
  });
}

function isMaxOnlyFoil(foil: number): boolean {
  return foil === 2 || foil === 3 || foil === 4;
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
  cardDetailId,
  cardName,
  edition,
  foil,
  currentLevel,
  currentCc,
  cardRarity,
  cardTier,
  cardStats,
  settings,
  initialTargetBracket,
  selectableAccounts,
  accountStates,
  accountBalances,
  canBuy,
  onClose,
  onAddToPurchasePlan,
}: Readonly<BuyCardDialogProps>) {
  const { rows, loading, error, fetchRows } = useMarketListings();
  const { items: cartItems, removeItem, removeMany, notifyBalancesRefresh } = usePurchasePlan();

  const [activeMode, setActiveMode] = useState<BuyCardDialogMode>(mode);
  const [targetBracket, setTargetBracket] = useState<LeagueBracket | "">(
    initialTargetBracket || ""
  );
  const [selectedAccount, setSelectedAccount] = useState(account.toLowerCase());
  const [selectedFoil, setSelectedFoil] = useState(foil);
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
  const [txProgress, setTxProgress] = useState<{
    submitted: boolean;
    processed: boolean;
    txId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedAccount(account.toLowerCase());
    setActiveMode(mode);
    setTargetBracket(initialTargetBracket || "");
  }, [account, mode, open, initialTargetBracket]);

  useEffect(() => {
    if (!open) return;

    const maxOnlyFoil = isMaxOnlyFoil(selectedFoil);
    const cardDetailMaxLevel = cardStats
      ? Math.max(
          cardStats.health?.length ?? 0,
          cardStats.armor?.length ?? 0,
          cardStats.speed?.length ?? 0,
          cardStats.attack?.length ?? 0,
          cardStats.ranged?.length ?? 0,
          cardStats.magic?.length ?? 0,
          cardStats.mana?.length ?? 0,
          cardStats.abilities?.length ?? 0,
          1
        )
      : 1;

    fetchRows({
      cardDetailId,
      edition,
      foil: selectedFoil,
      type: "buy",
      level:
        activeMode === "manual-listings"
          ? maxOnlyFoil
            ? cardDetailMaxLevel
            : levelFilter !== "all"
              ? levelFilter
              : undefined
          : undefined,
    });
  }, [activeMode, cardDetailId, cardStats, edition, fetchRows, levelFilter, open, selectedFoil]);

  useEffect(() => {
    setSelectedIds([]);
    setShiftAnchorIndex(null);
    setPage(1);
  }, [selectedFoil, levelFilter, pageSize, selectedAccount, activeMode]);

  const listingLevels = useMemo(
    () => Array.from(new Set(rows.map((row) => row.level))).sort((a, b) => a - b),
    [rows]
  );

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      const delta = Number(av) - Number(bv);
      return sortDir === "asc" ? delta : -delta;
    });
    return sorted;
  }, [rows, sortBy, sortDir]);

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
      cardName,
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

  const selectedFoilName: CardFoil =
    selectedFoil === 0
      ? "regular"
      : selectedFoil === 1
        ? "gold"
        : selectedFoil === 2
          ? "gold arcane"
          : selectedFoil === 3
            ? "black"
            : "black arcane";

  const accountState = accountStates?.[selectedAccount] ?? {
    highestLevel: Math.max(0, currentLevel ?? 0),
    highestCc: Math.max(0, currentCc ?? 0),
    totalCc: Math.max(0, currentCc ?? 0),
  };
  const balance = accountBalances?.[selectedAccount] ?? { DEC: 0, CREDITS: 0 };

  const canAffordDec = selectionTotals.dec <= balance.DEC;
  const canAffordCredits = selectionTotals.credits <= balance.CREDITS;

  const combineRates = useMemo(() => {
    if (!settings || !cardRarity) return null;
    return getCombineRatesForCard(settings, edition, selectedFoil, cardRarity, cardTier);
  }, [settings, cardRarity, edition, selectedFoil, cardTier]);

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
    if (!combineRates || !cardStats || !cardRarity)
      return [] as Array<{
        level: number;
        bracket: LeagueBracket;
        bracketLabel: string;
        playableBrackets: LeagueBracket[];
        targetCc: number;
        ownedBcx: number;
        neededBcx: number;
        dec: number;
        credits: number;
        usd: number;
        planItems: PurchasePlanItem[];
        exact: boolean;
        abilities: string[];
        inTargetBracket: boolean;
      }>;

    const [targetMin, targetMax] =
      targetBracket == "" ? [0, 0] : getBracketLevelRange(targetBracket, cardRarity);
    const maxOnlyFoil = isMaxOnlyFoil(selectedFoil);
    const numberOfLevels = combineRates.length;
    const startLevel = maxOnlyFoil ? numberOfLevels - 1 : 1;

    const rowsByLevel = Array.from({ length: numberOfLevels - startLevel + 1 }, (_, idx) => {
      const level = startLevel + idx;
      const req = calculateUpgradeRequirements(accountState.totalCc, level, combineRates);
      const selection = selectCheapestListings(rows, req.missingCc);
      const plan = buildPurchasePlan({
        account: selectedAccount,
        cardName,
        listings: selection.selected,
      });
      const bracket = levelBracket(level, cardRarity);

      return {
        level,
        bracket,
        bracketLabel: LEAGUE_BRACKETS[bracket].label,
        playableBrackets: playableBrackets(level, cardRarity),
        targetCc: req.targetCc,
        ownedBcx: accountState.totalCc,
        neededBcx: req.missingCc,
        dec: plan.totals.dec,
        credits: plan.items.reduce((sum, item) => sum + item.priceCredits, 0),
        usd: plan.totals.usd,
        planItems: plan.items,
        exact: selection.exact || req.missingCc === 0,
        abilities: cumulativeAbilities(cardStats.abilities ?? [], level),
        inTargetBracket: level >= targetMin && level <= targetMax,
      };
    });

    return rowsByLevel;
  }, [
    accountState.totalCc,
    cardName,
    cardRarity,
    cardStats,
    combineRates,
    rows,
    selectedAccount,
    selectedFoil,
    targetBracket,
  ]);

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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>Buy CC - {cardName}</DialogTitle>
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
                cardName,
                edition,
                selectedFoilName,
                Math.max(1, accountState.highestLevel)
              )}
              alt={cardName}
              width={100}
              height={160}
              style={{ objectFit: "contain" }}
            />

            <Stack spacing={1}>
              <Typography variant="h6">{cardName}</Typography>
              <Typography variant="body2">Edition: {edition}</Typography>
              <Typography variant="body2">Current Level: {accountState.highestLevel}</Typography>
              <Typography
                variant="body2"
                sx={isHighestCcAtMaxLevel ? { color: "success.main", fontWeight: 700 } : undefined}
              >
                Owned BCX: {accountState.highestCc}
              </Typography>
              {activeMode === "target-level" && cardRarity && targetBracket !== "" && (
                <Typography variant="body2" color="error.main">
                  Target: {LEAGUE_BRACKETS[targetBracket].label} (
                  {getBracketLevelRange(targetBracket, cardRarity)[0]}-
                  {getBracketLevelRange(targetBracket, cardRarity)[1]})
                </Typography>
              )}
              <Typography variant="body2">
                Balance: DEC {balance.DEC.toFixed(3)} / CREDITS {balance.CREDITS.toFixed(0)}
              </Typography>

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
                    onChange={(e) => setSelectedFoil(Number(e.target.value))}
                  >
                    <MenuItem value={0}>Regular</MenuItem>
                    <MenuItem value={1}>Gold</MenuItem>
                    <MenuItem value={2}>Gold Arcane</MenuItem>
                    <MenuItem value={3}>Black</MenuItem>
                    <MenuItem value={4}>Black Arcane</MenuItem>
                  </Select>
                </FormControl>

                {activeMode === "target-level" && cardRarity && (
                  <BracketFilter
                    selectedBracket={targetBracket}
                    setSelectedBracket={setTargetBracket}
                  />
                )}
              </Box>
            </Stack>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {activeMode === "target-level" ? (
            <>
              {!combineRates && (
                <Alert severity="warning">
                  Target-level calculations are unavailable for this card configuration.
                </Alert>
              )}

              {combineRates && (
                <ScrollableTableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Playable Bracket</TableCell>
                        <TableCell>Level</TableCell>
                        {dynamicStats.map((row) => (
                          <TableCell key={row.key}>
                            <Tooltip title={row.label}>
                              <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                                <Image
                                  src={
                                    STAT_ICON_URL[row.key as Exclude<keyof CardStats, "abilities">]
                                  }
                                  alt={row.label}
                                  width={18}
                                  height={18}
                                />
                              </Box>
                            </Tooltip>
                          </TableCell>
                        ))}
                        <TableCell>Abilities</TableCell>
                        <TableCell>Target BCX</TableCell>
                        <TableCell>Owned BCX</TableCell>
                        <TableCell>Needed BCX</TableCell>
                        <TableCell>Upgrade Cost ($)</TableCell>
                        <TableCell>Add to Cart</TableCell>
                        <TableCell>Buy Credits</TableCell>
                        <TableCell>Buy DEC</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {targetRows.map((row) => {
                        const highlighted = row.level === accountState.highestLevel;

                        const [targetMin, targetMax] =
                          cardRarity && targetBracket !== ""
                            ? getBracketLevelRange(targetBracket, cardRarity)
                            : [null, null];

                        const targetBottom = row.level === targetMin;
                        const targetTop = row.level === targetMax;

                        return (
                          <TableRow
                            key={row.level}
                            selected={highlighted}
                            sx={{
                              "& td": {
                                ...(targetBottom && {
                                  borderTop: "2px solid",
                                  borderTopColor: "error.main",
                                }),

                                ...(targetTop && {
                                  borderBottom: "2px solid",
                                  borderBottomColor: "error.main",
                                }),
                              },
                            }}
                          >
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                flexWrap="wrap"
                              >
                                {row.playableBrackets.map((bracket) => {
                                  const logo = findLeagueLogoUrl(
                                    "modern",
                                    BRACKET_LOGO_LEAGUE[bracket]
                                  );
                                  if (!logo) return null;
                                  return (
                                    <Tooltip
                                      key={`${row.level}-${bracket}`}
                                      title={LEAGUE_BRACKETS[bracket].label}
                                    >
                                      <Box sx={{ display: "inline-flex" }}>
                                        <Image
                                          src={logo}
                                          alt={LEAGUE_BRACKETS[bracket].label}
                                          width={18}
                                          height={18}
                                        />
                                      </Box>
                                    </Tooltip>
                                  );
                                })}
                              </Stack>
                            </TableCell>
                            <TableCell>{row.level}</TableCell>
                            {dynamicStats.map((stat) => (
                              <TableCell key={stat.key}>
                                {cardStats?.[stat.key][Math.max(0, row.level - 1)] ?? 0}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {row.abilities.map((ability) => (
                                  <Tooltip key={`${row.level}-${ability}`} title={ability}>
                                    <Box sx={{ display: "inline-flex" }}>
                                      <Image
                                        src={abilityIconUrl(ability)}
                                        alt={ability}
                                        width={22}
                                        height={22}
                                        style={{ borderRadius: 4 }}
                                      />
                                    </Box>
                                  </Tooltip>
                                ))}
                                {row.abilities.length === 0 && (
                                  <Typography variant="caption">-</Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>{row.targetCc}</TableCell>
                            <TableCell
                              sx={
                                row.level === accountState.highestLevel && isHighestCcAtMaxLevel
                                  ? { color: "success.main", fontWeight: 700 }
                                  : undefined
                              }
                            >
                              {row.level === accountState.highestLevel
                                ? accountState.highestCc
                                : row.ownedBcx}
                            </TableCell>
                            <TableCell>{row.neededBcx}</TableCell>
                            <TableCell>{row.usd > 0 ? row.usd.toFixed(3) : "-"}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!canBuy || row.planItems.length === 0 || !row.exact}
                                onClick={() => onAddToPurchasePlan(row.planItems)}
                              >
                                Add
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={
                                  !canBuy ||
                                  buyBusy ||
                                  row.planItems.length === 0 ||
                                  !row.exact ||
                                  row.planItems.reduce((sum, item) => sum + item.priceCredits, 0) >
                                    balance.CREDITS
                                }
                                onClick={() => runCheckoutForPlan(row.planItems, "CREDITS")}
                              >
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Image
                                    src={credits_icon_url}
                                    alt="Credits"
                                    width={14}
                                    height={14}
                                  />
                                  <Typography variant="caption">
                                    {row.credits.toFixed(0)}
                                  </Typography>
                                </Stack>
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={
                                  !canBuy ||
                                  buyBusy ||
                                  row.planItems.length === 0 ||
                                  !row.exact ||
                                  row.planItems.reduce((sum, item) => sum + item.priceDec, 0) >
                                    balance.DEC
                                }
                                onClick={() => runCheckoutForPlan(row.planItems, "DEC")}
                              >
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Image src={dec_icon_url} alt="DEC" width={14} height={14} />
                                  <Typography variant="caption">{row.dec.toFixed(3)}</Typography>
                                </Stack>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollableTableContainer>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Listing Level</InputLabel>
                  <Select
                    label="Listing Level"
                    value={levelFilter}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLevelFilter(v === "all" ? "all" : Number(v));
                    }}
                  >
                    <MenuItem value="all">All levels</MenuItem>
                    {listingLevels.map((level) => (
                      <MenuItem key={level} value={level}>
                        Level {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Rows</InputLabel>
                  <Select
                    label="Rows"
                    value={pageSize}
                    onChange={(e) =>
                      setPageSize(Number(e.target.value) as (typeof PAGE_OPTIONS)[number])
                    }
                  >
                    {PAGE_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <ScrollableTableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Cart</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "level"}
                          direction={sortBy === "level" ? sortDir : "asc"}
                          onClick={() => toggleSort("level")}
                        >
                          Level
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "cc"}
                          direction={sortBy === "cc" ? sortDir : "asc"}
                          onClick={() => toggleSort("cc")}
                        >
                          CC
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "priceUsd"}
                          direction={sortBy === "priceUsd" ? sortDir : "asc"}
                          onClick={() => toggleSort("priceUsd")}
                        >
                          USD
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "priceDec"}
                          direction={sortBy === "priceDec" ? sortDir : "asc"}
                          onClick={() => toggleSort("priceDec")}
                        >
                          DEC
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "priceCredits"}
                          direction={sortBy === "priceCredits" ? sortDir : "asc"}
                          onClick={() => toggleSort("priceCredits")}
                        >
                          Credits
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === "pricePerCcDec"}
                          direction={sortBy === "pricePerCcDec" ? sortDir : "asc"}
                          onClick={() => toggleSort("pricePerCcDec")}
                        >
                          DEC/CC
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Seller</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedRows.map((row, idx) => {
                      const globalIndex = (page - 1) * pageSize + idx;
                      const inCart = inCartSet.has(row.marketId);
                      const reservedByOther = reservedByOtherAccountSet.has(row.marketId);
                      const cannotAddBecauseReserved = !inCart && reservedByOther;
                      const cartButtonTooltip = cannotAddBecauseReserved
                        ? "This marketplace listing is already reserved by another account in your purchase plan."
                        : inCart
                          ? "Remove from cart"
                          : "Add to cart";

                      return (
                        <TableRow key={row.marketId} selected={selectedIds.includes(row.marketId)}>
                          <TableCell>
                            <Tooltip title={cartButtonTooltip}>
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color={inCart ? "error" : "success"}
                                  disabled={cannotAddBecauseReserved}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={(event) =>
                                    toggleCartByButton(globalIndex, event.shiftKey)
                                  }
                                  sx={{
                                    minWidth: 36,
                                    px: 1,
                                    textTransform: "none",
                                    "&:hover": { opacity: 0.9 },
                                  }}
                                >
                                  {inCart ? "-" : "+"}
                                </Button>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{row.level}</TableCell>
                          <TableCell>{row.cc}</TableCell>
                          <TableCell>
                            <CurrencyAmountChip currency="USD" value={row.priceUsd} />
                          </TableCell>
                          <TableCell>
                            <CurrencyAmountChip currency="DEC" value={row.priceDec} />
                          </TableCell>
                          <TableCell>
                            <CurrencyAmountChip currency="CREDITS" value={row.priceCredits ?? 0} />
                          </TableCell>
                          <TableCell>{row.pricePerCcDec.toFixed(3)}</TableCell>
                          <TableCell>{row.seller ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && pagedRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8}>No listings found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollableTableContainer>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Shift-click on +/- applies add/remove to a row range.
                </Typography>
                <Pagination page={page} count={pageCount} onChange={(_e, p) => setPage(p)} />
              </Box>

              <ManualSelectionTotalsBar selectionTotals={selectionTotals} />
            </>
          )}

          <PurchaseTxProgressPanel buyBusy={buyBusy} txProgress={txProgress} />

          {!canBuy && (
            <Alert severity="warning">Browsing is enabled, but buy actions are disabled.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>

        {activeMode === "manual-listings" && (
          <>
            <Tooltip
              title={
                !canAffordDec && canBuy && selectedItems.length > 0
                  ? `Insufficient DEC (${selectionTotals.dec.toFixed(3)} required)`
                  : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  onClick={() => buySelected("DEC")}
                  disabled={buyBusy || !canBuy || selectedItems.length === 0 || !canAffordDec}
                >
                  {buyBusy ? "Processing..." : "Buy with DEC"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canAffordCredits && canBuy && selectedItems.length > 0
                  ? `Insufficient Credits (${selectionTotals.credits.toFixed(0)} required)`
                  : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  onClick={() => buySelected("CREDITS")}
                  disabled={buyBusy || !canBuy || selectedItems.length === 0 || !canAffordCredits}
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
