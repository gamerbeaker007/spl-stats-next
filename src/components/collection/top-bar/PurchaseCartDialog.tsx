"use client";

import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import { usePurchaseCheckout } from "@/hooks/cards/usePurchaseCheckout";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { MdDelete } from "react-icons/md";
import { MdCheckCircle, MdErrorOutline, MdRadioButtonUnchecked } from "react-icons/md";
import { useEffect, useMemo, useState } from "react";
import { getFoilLabel } from "@/lib/shared/card-utils";

export default function PurchaseCartDialog() {
  const {
    items,
    isCheckoutOpen,
    setCheckoutOpen,
    removeItem,
    removeMany,
    clear,
    notifyBalancesRefresh,
  } = usePurchasePlan();
  const { checkout, busy, error, progress, reset } = usePurchaseCheckout(items);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      const rows = await getBalancesForAccountsAction(accounts);
      if (!active) return;
      const mapped: Record<string, { DEC: number; CREDITS: number }> = {};
      for (const row of rows) {
        mapped[row.account] = {
          DEC:
            (row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0) +
            (row.balances.find((entry) => entry.token === "DEC-B")?.balance ?? 0),
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
        acc.cc += item.cc;
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
        usd: number;
        dec: number;
        credits: number;
      }
    >();

    for (const item of items) {
      const key = item.account.toLowerCase();
      const current = byAccount.get(key) ?? { count: 0, usd: 0, dec: 0, credits: 0 };
      current.count += 1;
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

  async function runCheckout(currency: "DEC" | "CREDITS") {
    setSuccessMessage(null);
    try {
      const { confirmations, successfulItems } = await checkout(currency);
      const failed = confirmations.filter((entry) => !entry.status.success);

      if (successfulItems.length > 0) {
        removeMany(successfulItems);
        notifyBalancesRefresh();
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
    reset();
  }

  return (
    <Dialog open={isCheckoutOpen} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Purchase Plan Checkout</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {successMessage && <Alert severity="success">{successMessage}</Alert>}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Totals by account
            </Typography>
            {grouped.map(([account, summary]) => (
              <Typography variant="body2" key={account}>
                {account}: {summary.count} listings | USD {summary.usd.toFixed(3)} | DEC{" "}
                {summary.dec.toFixed(3)} / {(balanceMap[account]?.DEC ?? 0).toFixed(3)} | CREDITS{" "}
                {summary.credits.toFixed(0)} / {(balanceMap[account]?.CREDITS ?? 0).toFixed(0)}
              </Typography>
            ))}
          </Box>

          <Box>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={clear}
              disabled={items.length === 0}
            >
              Clear Cart
            </Button>
          </Box>

          <ScrollableTableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center">Remove</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Card</TableCell>
                  <TableCell>Edition</TableCell>
                  <TableCell>Foil</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>UID</TableCell>
                  <TableCell>CC</TableCell>
                  <TableCell>Seller</TableCell>
                  <TableCell>USD</TableCell>
                  <TableCell>DEC</TableCell>
                  <TableCell>CREDITS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.account}-${item.marketId}`}>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => removeItem(item.account, item.marketId)}
                        aria-label="Remove listing"
                      >
                        <MdDelete />
                      </IconButton>
                    </TableCell>
                    <TableCell>{item.account}</TableCell>
                    <TableCell>{item.cardName}</TableCell>
                    <TableCell>{item.edition}</TableCell>
                    <TableCell>{getFoilLabel(item.foil)}</TableCell>
                    <TableCell>{item.level}</TableCell>
                    <TableCell>{item.uid ?? "-"}</TableCell>
                    <TableCell>{item.cc}</TableCell>
                    <TableCell>{item.seller ?? "-"}</TableCell>
                    <TableCell>
                      <CurrencyAmountChip currency="USD" value={item.priceUsd} />
                    </TableCell>
                    <TableCell>
                      <CurrencyAmountChip currency="DEC" value={item.priceDec} />
                    </TableCell>
                    <TableCell>
                      <CurrencyAmountChip currency="CREDITS" value={item.priceCredits} />
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12}>No listings selected.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollableTableContainer>

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

          <Box>
            {progress.map((entry) => (
              <Box
                key={entry.account}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1,
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {entry.account}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {["verifying", "success", "error"].includes(entry.stage) ? (
                    <MdCheckCircle color="#2e7d32" />
                  ) : (
                    <MdRadioButtonUnchecked color="#9e9e9e" />
                  )}
                  <Typography variant="body2">
                    Transaction submitted (broadcast accepted)
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {entry.stage === "success" ? (
                    <MdCheckCircle color="#2e7d32" />
                  ) : entry.stage === "error" ? (
                    <MdErrorOutline color="#d32f2f" />
                  ) : (
                    <MdRadioButtonUnchecked color="#9e9e9e" />
                  )}
                  <Typography variant="body2">Transaction processed by Splinterlands</Typography>
                </Box>
                {entry.message && (
                  <Typography variant="caption" color="text.secondary">
                    {entry.message}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Tooltip
          title={
            !canCheckoutDec && items.length > 0 ? "One or more accounts has insufficient DEC" : ""
          }
        >
          <span>
            <Button
              variant="contained"
              onClick={() => runCheckout("DEC")}
              disabled={busy || items.length === 0 || !canCheckoutDec}
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
              onClick={() => runCheckout("CREDITS")}
              disabled={busy || items.length === 0 || !canCheckoutCredits}
            >
              {busy ? "Processing..." : "Buy with Credits"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
