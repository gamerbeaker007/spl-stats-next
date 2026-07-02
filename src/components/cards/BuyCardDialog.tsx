"use client";

import CurrencyAmountChip from "@/components/cards/CurrencyAmountChip";
import { useMarketListings } from "@/hooks/cards/useMarketListings";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { getCardImg } from "@/lib/collectionUtils";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { checkoutItems } from "@/lib/frontend/purchase/checkout";
import { CardFoil } from "@/types/card";
import type { PurchaseCurrency, PurchasePlanItem } from "@/types/purchase/purchase-plan";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MdCheckCircle, MdErrorOutline, MdRadioButtonUnchecked } from "react-icons/md";

export type BuyCardDialogMode = "manual-listings" | "target-level";

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
  selectableAccounts?: string[];
  canBuy: boolean;
  onClose: () => void;
  onAddToPurchasePlan: (items: PurchasePlanItem[]) => void;
}

const PAGE_OPTIONS = [20, 50, 100] as const;

export default function BuyCardDialog({
  open,
  mode,
  account,
  cardDetailId,
  cardName,
  edition,
  foil,
  currentCc,
  selectableAccounts,
  canBuy,
  onClose,
  onAddToPurchasePlan,
}: Readonly<BuyCardDialogProps>) {
  const { rows, loading, error, fetchRows } = useMarketListings();
  const { items: cartItems, removeItem, removeMany, notifyBalancesRefresh } = usePurchasePlan();

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
  const [accountBalances, setAccountBalances] = useState<{ DEC: number; CREDITS: number }>({
    DEC: 0,
    CREDITS: 0,
  });
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
  }, [account, open]);

  useEffect(() => {
    if (!open || mode !== "manual-listings") return;

    fetchRows({
      cardDetailId,
      edition,
      foil: selectedFoil,
      type: "buy",
      level: levelFilter === "all" ? undefined : levelFilter,
    });
  }, [cardDetailId, edition, fetchRows, levelFilter, mode, open, selectedFoil]);

  useEffect(() => {
    setSelectedIds([]);
    setShiftAnchorIndex(null);
    setPage(1);
  }, [selectedFoil, levelFilter, pageSize, selectedAccount]);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      const rows = await getBalancesForAccountsAction([selectedAccount]);
      const row = rows[0];
      if (!row || !active) return;
      const dec =
        (row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0) +
        (row.balances.find((entry) => entry.token === "DEC-B")?.balance ?? 0);
      const credits = row.balances.find((entry) => entry.token === "CREDITS")?.balance ?? 0;
      setAccountBalances({ DEC: dec, CREDITS: credits });
    }

    if (open && canBuy) loadBalance();
    return () => {
      active = false;
    };
  }, [canBuy, open, selectedAccount]);

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
  const previewLevel = selectedFoil === 3 || selectedFoil === 4 ? 1 : 1;

  const canAffordDec = selectionTotals.dec <= accountBalances.DEC;
  const canAffordCredits = selectionTotals.credits <= accountBalances.CREDITS;

  async function buySelected(currency: PurchaseCurrency) {
    if (selectedItems.length === 0) return;

    setBuyBusy(true);
    setTxProgress(null);

    try {
      const result = await checkoutItems(selectedItems, currency, {
        onBroadcast: ({ txId }) => {
          setTxProgress({ submitted: true, processed: false, txId });
        },
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

      setSelectedIds([]);
      setShiftAnchorIndex(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      setTxProgress((prev) => ({
        submitted: prev?.submitted ?? false,
        processed: false,
        txId: prev?.txId,
        error: message,
      }));
    } finally {
      setBuyBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>Buy CC - {cardName}</DialogTitle>
      <DialogContent dividers>
        {mode !== "manual-listings" ? (
          <Alert severity="info">Target-level mode is reserved for a future feature.</Alert>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <Image
                src={getCardImg(cardName, edition, selectedFoilName, previewLevel)}
                alt={cardName}
                width={100}
                height={160}
                style={{ objectFit: "contain" }}
              />

              <Stack spacing={1}>
                <Typography variant="h6">{cardName}</Typography>
                <Typography variant="body2">Edition: {edition}</Typography>
                <Typography variant="body2">
                  Foil:
                  {selectedFoil === 0
                    ? " Regular"
                    : selectedFoil === 1
                      ? " Gold"
                      : selectedFoil === 2
                        ? " Gold Arcane"
                        : selectedFoil === 3
                          ? " Black"
                          : " Black Arcane"}
                </Typography>
                <Typography variant="body2">Owned CC: {currentCc ?? 0}</Typography>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
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
              </Stack>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

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
                    ? "This marketplace listing has already been reserved by another buyer account in your purchase plan."
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
                              onClick={(event) => toggleCartByButton(globalIndex, event.shiftKey)}
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

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Shift-click on +/- applies add/remove to a row range.
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    for (const row of selectedRows) {
                      removeItem(selectedAccount, row.marketId);
                    }
                    setSelectedIds([]);
                    setShiftAnchorIndex(null);
                  }}
                  disabled={selectedRows.length === 0}
                >
                  Clear Selection
                </Button>
              </Box>
              <Pagination page={page} count={pageCount} onChange={(_e, p) => setPage(p)} />
            </Box>

            {(txProgress || buyBusy) && (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {txProgress?.submitted ? (
                      <MdCheckCircle color="#2e7d32" />
                    ) : (
                      <MdRadioButtonUnchecked color="#9e9e9e" />
                    )}
                    <Typography variant="body2">
                      Transaction submitted (broadcast accepted)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {txProgress?.processed ? (
                      <MdCheckCircle color="#2e7d32" />
                    ) : txProgress?.error ? (
                      <MdErrorOutline color="#d32f2f" />
                    ) : (
                      <MdRadioButtonUnchecked color="#9e9e9e" />
                    )}
                    <Typography variant="body2">Transaction processed by Splinterlands</Typography>
                  </Box>
                  {txProgress?.txId && (
                    <Typography variant="caption" color="text.secondary">
                      Tx: {txProgress.txId}
                    </Typography>
                  )}
                  {txProgress?.error && <Alert severity="error">{txProgress.error}</Alert>}
                  {txProgress?.submitted && txProgress?.processed && (
                    <Alert severity="success">Purchase confirmed successfully.</Alert>
                  )}
                </Stack>
              </Box>
            )}

            <Box
              sx={{
                position: "sticky",
                bottom: -16,
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "background.paper",
                py: 1,
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                zIndex: 1,
              }}
            >
              <Typography variant="body2" sx={{ alignSelf: "center", mr: 1 }}>
                Selected: {selectionTotals.count} listings / {selectionTotals.cc} CC
              </Typography>
              <CurrencyAmountChip currency="USD" value={selectionTotals.usd} />
              <CurrencyAmountChip currency="DEC" value={selectionTotals.dec} />
              <CurrencyAmountChip currency="CREDITS" value={selectionTotals.credits} />
            </Box>

            {!canBuy && (
              <Tooltip title="You need a signed monitored account to purchase.">
                <Alert severity="warning">Browsing is enabled, but buy actions are disabled.</Alert>
              </Tooltip>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
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
      </DialogActions>
    </Dialog>
  );
}
