"use client";

import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import PurchaseCartLandTable from "@/components/collection/top-bar/PurchaseCartLandTable";
import { usePurchaseCheckout } from "@/hooks/cards/usePurchaseCheckout";
import { fetchBalancesForAccounts } from "@/lib/frontend/spl-browser-api";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { isCardPurchaseItem, isLandPurchaseItem } from "@/types/purchase/purchase-plan";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import PurchaseCartCardTable from "@/components/collection/top-bar/PurchaseCartCardTable";

export default function PurchaseCartDialog() {
  const {
    items,
    isCheckoutOpen,
    setCheckoutOpen,
    removeItem,
    removeMany,
    markPurchased,
    clear,
    notifyBalancesRefresh,
    notifyCollectionRefresh,
  } = usePurchasePlan();
  const { checkout, busy, error, progress, reset } = usePurchaseCheckout(items);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const cardItems = useMemo(() => items.filter(isCardPurchaseItem), [items]);
  const landItems = useMemo(() => items.filter(isLandPurchaseItem), [items]);
  const [balanceMap, setBalanceMap] = useState<Record<string, { DEC: number; CREDITS: number }>>(
    {}
  );

  useEffect(() => {
    let active = true;
    async function loadBalances() {
      const accounts = Array.from(new Set(items.map((item) => item.account.toLowerCase())));
      if (accounts.length === 0) {
        setBalanceMap({});
        return;
      }
      const rows = await fetchBalancesForAccounts(accounts);
      if (!active) return;
      const mapped: Record<string, { DEC: number; CREDITS: number }> = {};
      for (const row of rows) {
        mapped[row.account] = {
          DEC: row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0,
          CREDITS: row.balances.find((entry) => entry.token === "CREDITS")?.balance ?? 0,
        };
      }
      setBalanceMap(mapped);
    }

    if (isCheckoutOpen) {
      loadBalances();
    }

    return () => {
      active = false;
    };
  }, [isCheckoutOpen, items]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.cc += isCardPurchaseItem(item) ? item.cc : 0;
        acc.usd += item.priceUsd;
        acc.dec += item.priceDec;
        acc.credits += item.priceCredits;
        return acc;
      },
      { cc: 0, usd: 0, dec: 0, credits: 0 }
    );
  }, [items]);

  const grouped = useMemo(() => {
    const byAccount = new Map<
      string,
      {
        count: number;
        cc: number;
        usd: number;
        dec: number;
        credits: number;
      }
    >();

    for (const item of items) {
      const key = item.account.toLowerCase();
      const current = byAccount.get(key) ?? { count: 0, cc: 0, usd: 0, dec: 0, credits: 0 };
      current.count += 1;
      current.cc += isCardPurchaseItem(item) ? item.cc : 0;
      current.usd += item.priceUsd;
      current.dec += item.priceDec;
      current.credits += item.priceCredits;
      byAccount.set(key, current);
    }

    return Array.from(byAccount.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const canCheckoutDec = useMemo(
    () => grouped.every(([account, summary]) => (balanceMap[account]?.DEC ?? 0) >= summary.dec),
    [balanceMap, grouped]
  );

  const canCheckoutCredits = useMemo(
    () =>
      grouped.every(([account, summary]) => (balanceMap[account]?.CREDITS ?? 0) >= summary.credits),
    [balanceMap, grouped]
  );

  const hasProgressError = useMemo(
    () => progress.some((entry) => entry.stage === "error"),
    [progress]
  );

  async function runCheckout(currency: "DEC" | "CREDITS") {
    setSuccessMessage(null);
    setWarningMessage(null);
    try {
      const { confirmations, successfulItems, unavailableItems } = await checkout(currency);
      const failed = confirmations.filter((entry) => !entry.status.success);

      if (unavailableItems.length > 0) {
        removeMany(unavailableItems);
        setWarningMessage(
          `${unavailableItems.length} land listing(s) were sold or delisted and have been removed from the cart.`
        );
      }

      if (successfulItems.length > 0) {
        removeMany(successfulItems);
        markPurchased(successfulItems);
        notifyBalancesRefresh();
        notifyCollectionRefresh();
      }

      if (failed.length === 0) {
        setSuccessMessage("Purchase confirmed successfully.");
      }
    } catch {
      // Error state is already captured in usePurchaseCheckout.
    }
  }

  function handleClose() {
    setCheckoutOpen(false);
    setSuccessMessage(null);
    setWarningMessage(null);
    reset();
  }

  return (
    <Dialog open={isCheckoutOpen} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Purchase Plan Checkout</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && !hasProgressError && <Alert severity="error">{error}</Alert>}
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {warningMessage && <Alert severity="warning">{warningMessage}</Alert>}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Totals by account
            </Typography>
            {grouped.map(([account, summary]) => (
              <Stack key={account} direction={"row"} alignItems={"center"} gap={1} py={0.2}>
                <Typography variant={"body2"} fontWeight={600}>
                  {account}:
                </Typography>
                <Typography variant={"body2"}>
                  #{summary.count} | CC {summary.cc}
                </Typography>
                <CurrencyAmountChip currency={"USD"} value={summary.usd} />
                <CurrencyAmountChip
                  currency={"CREDITS"}
                  value={summary.credits}
                  compareValue={balanceMap[account]?.CREDITS ?? 0}
                />
                <CurrencyAmountChip
                  currency={"DEC"}
                  value={summary.dec}
                  compareValue={balanceMap[account]?.DEC ?? 0}
                />
              </Stack>
            ))}
          </Box>

          {(cardItems.length > 0 || landItems.length === 0) && (
            <PurchaseCartCardTable items={cardItems} onRemove={removeItem} />
          )}

          {landItems.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Land ({landItems.length})
              </Typography>
              <PurchaseCartLandTable items={landItems} onRemove={removeItem} />
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
              alignItems: "center",
            }}
          >
            <Typography variant="body2">Items {items.length}</Typography>
            <Typography variant="body2">CC {totals.cc}</Typography>
            <CurrencyAmountChip currency="USD" value={totals.usd} />
            <CurrencyAmountChip currency="DEC" value={totals.dec} />
            <CurrencyAmountChip currency="CREDITS" value={totals.credits} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ width: "100%", justifyContent: "space-between" }}
        >
          {progress.map((entry) => (
            <TransactionProgressPanel
              key={entry.account}
              txProgress={{
                label: entry.account,
                status:
                  entry.stage === "success"
                    ? "verified"
                    : entry.stage === "error"
                      ? "error"
                      : "processing",
                txId: entry.txId,
                error: entry.stage === "error" ? entry.message : undefined,
                message: entry.stage !== "error" ? entry.message : undefined,
              }}
            />
          ))}
        </Stack>
        <Button size="small" onClick={handleClose}>
          Close
        </Button>

        <Box>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={clear}
            disabled={busy || items.length === 0}
            hidden={items.length === 0}
            sx={{ whiteSpace: "nowrap" }}
          >
            Clear Cart
          </Button>
        </Box>

        <Tooltip
          title={
            !canCheckoutDec && items.length > 0 ? "One or more accounts has insufficient DEC" : ""
          }
        >
          <span>
            <Button
              variant="contained"
              size="small"
              onClick={() => runCheckout("DEC")}
              disabled={busy || items.length === 0 || !canCheckoutDec}
              sx={{ whiteSpace: "nowrap" }}
            >
              {busy ? "Processing..." : "Buy with DEC"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          title={
            !canCheckoutCredits && items.length > 0
              ? "One or more accounts has insufficient Credits"
              : ""
          }
        >
          <span>
            <Button
              variant="contained"
              size="small"
              onClick={() => runCheckout("CREDITS")}
              disabled={busy || items.length === 0 || !canCheckoutCredits}
              sx={{ whiteSpace: "nowrap" }}
            >
              {busy ? "Processing..." : "Buy With Credits"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
