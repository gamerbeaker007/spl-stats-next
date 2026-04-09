"use client";

import AddInvestmentDialog from "@/components/portfolio/AddInvestmentDialog";
import CollectionChart from "@/components/portfolio/CollectionChart";
import OtherAssetsChart from "@/components/portfolio/OtherAssetsChart";
import PortfolioSummaryCards from "@/components/portfolio/PortfolioSummaryCards";
import PortfolioTotalChart from "@/components/portfolio/PortfolioTotalChart";
import InventoryChart from "@/components/portfolio/InventoryChart";
import SpsChart from "@/components/portfolio/SpsChart";
import type {
  PortfolioHistoryResult,
  PortfolioOverviewResult,
} from "@/lib/backend/actions/portfolio-actions";
import {
  getPortfolioHistoryAction,
  getPortfolioOverviewAction,
} from "@/lib/backend/actions/portfolio-actions";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { MdAddCircleOutline } from "react-icons/md";

interface Props {
  allAccounts: string[];
}

export default function PortfolioContent({ allAccounts }: Props) {
  const [selected, setSelected] = useState<string[]>(allAccounts);
  const [overview, setOverview] = useState<PortfolioOverviewResult | null>(null);
  const [historyData, setHistoryData] = useState<PortfolioHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { theme } = useTheme();

  const refresh = useCallback(async () => {
    if (selected.length === 0) {
      setOverview(null);
      setHistoryData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ov, hist] = await Promise.all([
        getPortfolioOverviewAction(selected),
        getPortfolioHistoryAction(selected),
      ]);
      setOverview(ov);
      setHistoryData(hist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleAccountChange(event: SelectChangeEvent<string[]>) {
    const value = event.target.value;
    setSelected(typeof value === "string" ? value.split(",") : value);
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4">Portfolio Overview</Typography>
        <Button
          variant="outlined"
          startIcon={<MdAddCircleOutline />}
          onClick={() => setDialogOpen(true)}
          disabled={allAccounts.length === 0}
        >
          Investments
        </Button>
      </Stack>

      {/* Account selector */}
      {allAccounts.length > 1 && (
        <FormControl sx={{ mb: 3, minWidth: 320 }} size="small">
          <InputLabel>Accounts</InputLabel>
          <Select
            multiple
            value={selected}
            onChange={handleAccountChange}
            input={<OutlinedInput label="Accounts" />}
            renderValue={(sel) => {
              const s = sel as string[];
              if (s.length === 0) return "";
              return s.join(", ");
            }}
          >
            {allAccounts.map((acct) => (
              <MenuItem key={acct} value={acct}>
                <Checkbox checked={selected.includes(acct)} />
                <ListItemText primary={acct} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading portfolio data…
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {selected.length === 0 && (
        <Alert severity="info">Select at least one account to view portfolio data.</Alert>
      )}

      {!loading && overview && (
        <Stack spacing={4}>
          {/* Summary cards (latest snapshot) */}
          {overview.snapshot ? (
            <PortfolioSummaryCards
              snapshot={overview.snapshot}
              totalInvested={overview.totalInvested}
            />
          ) : (
            <Alert severity="info">
              No portfolio snapshot data found. The worker needs to run first, or import data from
              the Admin page.
            </Alert>
          )}

          <Divider />

          {/* Total value + investment chart */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Portfolio Value History
            </Typography>
            {historyData && (
              <PortfolioTotalChart
                history={historyData.history}
                cumulativeInvestments={historyData.cumulativeInvestments}
                theme={theme}
              />
            )}
          </Box>

          <Divider />

          {/* Collection chart */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Collection History
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Per-edition market value (left Y) and BCX count (right Y, dashed). Click legend to
              toggle visibility.
            </Typography>
            {historyData && <CollectionChart history={historyData.history} theme={theme} />}
          </Box>

          <Divider />

          {/* SPS chart */}
          <Box>
            <Typography variant="h6" gutterBottom>
              SPS History
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Left axis: USD value. Right axis: quantity (solid = liquid, dashed = staked).
            </Typography>
            {historyData && <SpsChart history={historyData.history} theme={theme} />}
          </Box>

          <Divider />

          {/* Other assets chart */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Other Assets History
            </Typography>
            {historyData && <OtherAssetsChart history={historyData.history} theme={theme} />}
          </Box>

          <Divider />

          {/* Inventory chart */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Inventory History
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Per-item value (left Y) and quantity (right Y, dotted). Click legend group to toggle
              both at once.
            </Typography>
            {historyData && <InventoryChart history={historyData.history} theme={theme} />}
          </Box>
        </Stack>
      )}

      {/* Investment dialog */}
      <AddInvestmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={allAccounts}
        investments={overview?.investments ?? []}
        onSuccess={() => {
          setDialogOpen(false);
          refresh();
        }}
      />
    </Box>
  );
}
