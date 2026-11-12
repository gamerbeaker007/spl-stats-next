"use client";

import ChartFilterChips from "@/components/portfolio/ChartFilterChips";
import ChartMetricToggle, { type ChartMetric } from "@/components/portfolio/ChartMetricToggle";
import InventoryChart from "@/components/portfolio/InventoryChart";
import PortfolioDataState from "@/components/portfolio/PortfolioDataState";
import { MAX_LEGEND_ITEMS } from "@/components/portfolio/chartConstants";
import { useInventoryHistory } from "@/hooks/portfolio/usePortfolioHistory";
import type { InventoryHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import { usePortfolio } from "@/lib/frontend/context/PortfolioContext";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

/** "LAND_RESOURCE" → "Land Resource" */
function formatAssetName(assetName: string): string {
  return assetName
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Item name → asset type, for every item that has data at some point. */
function collectItems(history: InventoryHistoryPoint[]): Map<string, string> {
  const items = new Map<string, string>();
  for (const p of history) {
    for (const item of p.items) {
      if (!items.has(item.name)) items.set(item.name, item.assetName);
    }
  }
  return items;
}

function InventoryHistorySection({ history }: { history: InventoryHistoryPoint[] }) {
  const { theme } = useTheme();
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [metric, setMetric] = useState<ChartMetric>("both");

  const itemTypes = useMemo(() => collectItems(history), [history]);
  const allNames = useMemo(() => Array.from(itemTypes.keys()).sort(), [itemTypes]);
  const typeOptions = useMemo(
    () =>
      Array.from(new Set(itemTypes.values()))
        .sort()
        .map((type) => ({ key: type, label: formatAssetName(type) })),
    [itemTypes]
  );

  // Items matching the type filter (empty = all types) — also the item picker's options.
  const typeFilteredNames = useMemo(
    () =>
      allNames.filter(
        (name) => selectedTypes.size === 0 || selectedTypes.has(itemTypes.get(name)!)
      ),
    [allNames, itemTypes, selectedTypes]
  );

  const visibleNames = useMemo(() => {
    const picked = selectedItems.filter((name) => typeFilteredNames.includes(name));
    return new Set(picked.length > 0 ? picked : typeFilteredNames);
  }, [selectedItems, typeFilteredNames]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <ChartFilterChips
            label="Filter by type"
            options={typeOptions}
            selected={selectedTypes}
            onChange={setSelectedTypes}
          />
        </Box>
        <ChartMetricToggle value={metric} onChange={setMetric} qtyLabel="Quantity" />
      </Stack>
      <Autocomplete
        multiple
        size="small"
        options={typeFilteredNames}
        value={selectedItems.filter((name) => typeFilteredNames.includes(name))}
        onChange={(_e, next) => setSelectedItems(next)}
        renderInput={(params) => (
          <TextField {...params} label="Items" placeholder="All items of the selected types" />
        )}
        sx={{ maxWidth: 720 }}
      />
      <Typography variant="caption" color="text.secondary">
        Per-item value (left Y) and quantity (right Y, dotted).{" "}
        {visibleNames.size > MAX_LEGEND_ITEMS
          ? `More than ${MAX_LEGEND_ITEMS} items shown — legend hidden, hover a line to see the item. Narrow the filter to show the legend.`
          : "Click a legend entry to toggle value and quantity at once."}
      </Typography>
      <InventoryChart
        history={history}
        allNames={allNames}
        visibleNames={visibleNames}
        metric={metric}
        theme={theme}
      />
    </Stack>
  );
}

/** /portfolio/inventory — per-item inventory value + quantity history. */
export default function PortfolioInventoryPage() {
  const { selectedAccounts } = usePortfolio();
  const { data, loading, error } = useInventoryHistory(selectedAccounts);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Inventory History
      </Typography>
      <PortfolioDataState data={data} loading={loading} error={error}>
        {(history) => <InventoryHistorySection history={history} />}
      </PortfolioDataState>
    </Box>
  );
}
