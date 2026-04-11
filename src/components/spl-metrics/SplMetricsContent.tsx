"use client";

/**
 * SplMetricsContent — the interactive metrics page.
 *
 * - Period selector: All / 12M / 6M / 1M / 2W / 7D
 * - Tabs: Battle Metrics | Card Market | User Metrics | Transactions
 * - Join-date lines toggle: shows monitored accounts as chips; extra accounts can be added/removed
 */

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

import PageNavTabs from "@/components/ui/PageNavTabs";
import JoinDatePicker, { type JoinDateEntry } from "@/components/spl-metrics/JoinDatePicker";
import {
  BattleChart,
  MarketChart,
  TxChart,
  UserChart,
} from "@/components/spl-metrics/SplMetricsCharts";
import { useSplMetrics } from "@/hooks/spl-metrics/useSplMetrics";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

interface PeriodOption {
  label: string;
  days: number | null;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "All", days: null },
  { label: "12 Months", days: 365 },
  { label: "6 Months", days: 180 },
  { label: "1 Month", days: 30 },
  { label: "2 Weeks", days: 14 },
  { label: "7 Days", days: 7 },
];

const TABS = [
  { label: "Battle Metrics" },
  { label: "Card Market" },
  { label: "User Metrics" },
  { label: "Transactions" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  monitoredAccounts: string[];
}

export default function SplMetricsContent({ monitoredAccounts }: Props) {
  const { rows, loading, error } = useSplMetrics();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<number | null>(7);
  const [showJoinDates, setShowJoinDates] = useState(false);
  const [joinEntries, setJoinEntries] = useState<JoinDateEntry[]>([]);

  // Filter rows by selected period
  const filteredRows = useMemo(() => {
    if (!period) return rows;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return rows.filter((r) => new Date(r.date) >= cutoff);
  }, [rows, period]);

  const visibleJoinEntries = showJoinDates ? joinEntries : [];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Period selector */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          Period:
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              variant={period === opt.days ? "contained" : "outlined"}
              onClick={() => setPeriod(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Join date picker */}
      <Box sx={{ mb: 2 }}>
        <JoinDatePicker
          monitoredAccounts={monitoredAccounts}
          entries={joinEntries}
          setEntries={setJoinEntries}
          showJoinDates={showJoinDates}
          setShowJoinDates={setShowJoinDates}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <PageNavTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <BattleChart rows={filteredRows} joinEntries={visibleJoinEntries} theme={theme} />
        )}
        {activeTab === 1 && (
          <MarketChart rows={filteredRows} joinEntries={visibleJoinEntries} theme={theme} />
        )}
        {activeTab === 2 && (
          <UserChart rows={filteredRows} joinEntries={visibleJoinEntries} theme={theme} />
        )}
        {activeTab === 3 && (
          <TxChart rows={filteredRows} joinEntries={visibleJoinEntries} theme={theme} />
        )}
      </Box>
    </Box>
  );
}
