"use client";

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import CurrencyAmountChip from "@/components/cards/CurrencyAmountChip";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { SplBalance } from "@/types/spl/balances";
import { Box, CircularProgress, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

interface AccountBalances {
  account: string;
  balances: SplBalance[];
}

function totalToken(rows: AccountBalances[], token: string): number {
  return rows.reduce(
    (sum, row) => sum + (row.balances.find((entry) => entry.token === token)?.balance ?? 0),
    0
  );
}

export default function TopBarBalances() {
  const { balanceRefreshVersion } = usePurchasePlan();
  const [rows, setRows] = useState<AccountBalances[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const monitored = await getMonitoredAccounts();
        const accounts = monitored.map((entry) => entry.username);
        if (accounts.length === 0) {
          if (active) setRows([]);
          return;
        }

        const balances = await getBalancesForAccountsAction(accounts);
        if (active) {
          setRows(balances as AccountBalances[]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [balanceRefreshVersion]);

  const totals = useMemo(
    () => ({
      credits: totalToken(rows, "CREDITS"),
      dec: totalToken(rows, "DEC") + totalToken(rows, "DEC-B"),
      sps: totalToken(rows, "SPS") + totalToken(rows, "SPSP"),
    }),
    [rows]
  );

  const tooltip = (
    <Box>
      {rows.map((row) => {
        const credits = row.balances.find((entry) => entry.token === "CREDITS")?.balance ?? 0;
        const dec =
          (row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0) +
          (row.balances.find((entry) => entry.token === "DEC-B")?.balance ?? 0);
        const sps =
          (row.balances.find((entry) => entry.token === "SPS")?.balance ?? 0) +
          (row.balances.find((entry) => entry.token === "SPSP")?.balance ?? 0);

        return (
          <Typography key={row.account} variant="body2">
            {row.account}: CREDITS {credits.toFixed(0)} | DEC {dec.toFixed(3)} | SPS{" "}
            {sps.toFixed(3)}
          </Typography>
        );
      })}
      {rows.length === 0 && <Typography variant="body2">No monitored balances loaded.</Typography>}
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement="bottom" arrow>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
        {loading && <CircularProgress size={14} />}
        <CurrencyAmountChip currency="CREDITS" value={totals.credits} />
        <CurrencyAmountChip currency="DEC" value={totals.dec} />
        <CurrencyAmountChip currency="SPS" value={totals.sps} />
      </Box>
    </Tooltip>
  );
}
