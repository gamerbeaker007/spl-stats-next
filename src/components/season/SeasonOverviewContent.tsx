"use client";

/**
 * SeasonOverviewContent
 *
 * Full season overview page with:
 *  - Account selector (from monitored accounts prop)
 *  - Tab navigation (Leaderboard | Earnings | Token Detail)
 *  - Plotly charts per tab
 */

import PageNavTabs from "@/components/ui/PageNavTabs";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import BalanceEarningsChart from "@/components/season/BalanceEarningsChart";
import LeaderboardHistoryChart from "@/components/season/LeaderboardHistoryChart";
import TokenDetailChart from "@/components/season/TokenDetailChart";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";

interface Props {
  /** Pre-fetched monitored account usernames for the selector. */
  accounts: string[];
}

export default function SeasonOverviewContent({ accounts }: Props) {
  const { theme } = useTheme();
  const [account, setAccount] = useState<string>(accounts[0] ?? "");
  const [tab, setTab] = useState(0);
  const [hideCurrentSeason, setHideCurrentSeason] = useState(false);

  const username = account || undefined;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Season Overview
      </Typography>

      {/* Account selector + hide current season toggle */}
      {accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No monitored accounts found. Add an account in the Users page.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Account</InputLabel>
            <Select value={account} label="Account" onChange={(e) => setAccount(e.target.value)}>
              {accounts.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={hideCurrentSeason}
                onChange={(e) => setHideCurrentSeason(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide current season</Typography>}
          />
        </Box>
      )}

      {/* Tab bar */}
      <Box sx={{ mb: 3 }}>
        <PageNavTabs
          tabs={[{ label: "Leaderboard" }, { label: "Earnings" }, { label: "Token Detail" }]}
          value={tab}
          onChange={setTab}
        />
      </Box>

      {/* Tab panels */}
      {tab === 0 && (
        <LeaderboardHistoryChart
          username={username}
          theme={theme}
          hideCurrentSeason={hideCurrentSeason}
        />
      )}
      {tab === 1 && (
        <BalanceEarningsChart
          username={username}
          theme={theme}
          hideCurrentSeason={hideCurrentSeason}
        />
      )}
      {tab === 2 && (
        <TokenDetailChart username={username} theme={theme} hideCurrentSeason={hideCurrentSeason} />
      )}
    </Box>
  );
}
