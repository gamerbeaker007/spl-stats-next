"use client";

import CurrencyAmountChip from "@/components/cards/top-bar/CurrencyAmountChip";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { SplBalance } from "@/types/spl/balances";
import { Avatar, Box, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";

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
  const { user, isAuthenticated } = useAuth();
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
          setRows(balances);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [balanceRefreshVersion, isAuthenticated, user?.username]);

  const totals = useMemo(
    () => ({
      credits: totalToken(rows, "CREDITS"),
      dec: totalToken(rows, "DEC"),
      sps: totalToken(rows, "SPS"),
    }),
    [rows]
  );

  const tooltip = (
    <Box>
      {rows.map((row) => {
        const credits = row.balances.find((entry) => entry.token === "CREDITS")?.balance ?? 0;
        const dec = row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0;
        const sps = row.balances.find((entry) => entry.token === "SPS")?.balance ?? 0;

        return (
          <Box key={row.account}>
            <Typography variant="body2">{row.account}</Typography>
            <Stack direction={"column"} gap={0.5}>
              <Stack direction={"row"} gap={0.5}>
                <Avatar src={credits_icon_url} alt={"CREDITS"} sx={{ width: 16, height: 16 }} />
                <Typography variant="caption">{credits.toFixed(3)}</Typography>
              </Stack>
              <Stack direction={"row"} gap={0.5}>
                <Avatar src={dec_icon_url} alt={"CREDITS"} sx={{ width: 16, height: 16 }} />
                <Typography variant="caption">{dec.toFixed(3)}</Typography>
              </Stack>
              <Stack direction={"row"} gap={0.5}>
                <Avatar src={sps_icon_url} alt={"CREDITS"} sx={{ width: 16, height: 16 }} />
                <Typography variant="caption">{sps.toFixed(3)}</Typography>
              </Stack>
            </Stack>
          </Box>
        );
      })}
      {rows.length === 0 && <Typography variant="body2">No monitored balances loaded.</Typography>}
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement="bottom" arrow>
      <Box display={"flex"} flexWrap={"wrap"} gap={1} sx={{ alignItems: "center", px: 1 }}>
        {loading && <CircularProgress size={14} />}
        <CurrencyAmountChip currency="CREDITS" value={totals.credits} />
        <CurrencyAmountChip currency="DEC" value={totals.dec} />
        <CurrencyAmountChip currency="SPS" value={totals.sps} />
      </Box>
    </Tooltip>
  );
}
