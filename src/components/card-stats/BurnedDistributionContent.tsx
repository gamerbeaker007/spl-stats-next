"use client";

import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import PlotlyChart from "@/components/shared/PlotlyChart";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { matchesCardStatsRow } from "@/lib/shared/card-filter-utils";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import { RARITY_COLORS, RARITY_ORDER } from "@/lib/shared/rarity-utils";
import type { CardDistributionRow } from "@/types/card-stats";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Data } from "plotly.js";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Pivot helpers
// ---------------------------------------------------------------------------

interface PivotRow {
  edition: string;
  values: Record<string, number>;
  total: number;
}

function buildPivot(rows: CardDistributionRow[], valueKey: "bcx" | "burnedBcx"): PivotRow[] {
  const map = new Map<string, Record<string, number>>();
  const order: string[] = [];
  for (const row of rows) {
    if (!map.has(row.editionLabel)) {
      map.set(row.editionLabel, {});
      order.push(row.editionLabel);
    }
    const entry = map.get(row.editionLabel)!;
    entry[row.rarityName] = (entry[row.rarityName] ?? 0) + row[valueKey];
  }
  return [...new Set(order)].map((ed) => {
    const values = map.get(ed) ?? {};
    return { edition: ed, values, total: RARITY_ORDER.reduce((s, r) => s + (values[r] ?? 0), 0) };
  });
}

function buildBurnedBcxChart(rows: CardDistributionRow[]): Data[] {
  const grouped: Record<string, Record<string, number>> = {};
  const order: string[] = [];
  for (const row of rows) {
    if (!grouped[row.editionLabel]) {
      grouped[row.editionLabel] = {};
      order.push(row.editionLabel);
    }
    grouped[row.editionLabel][row.rarityName] =
      (grouped[row.editionLabel][row.rarityName] ?? 0) + row.burnedBcx;
  }
  const editions = [...new Set(order)];
  return RARITY_ORDER.map((rarity) => ({
    type: "bar",
    name: rarity,
    x: editions,
    y: editions.map((ed) => grouped[ed]?.[rarity] ?? 0),
    marker: { color: RARITY_COLORS[rarity] },
  }));
}

// ---------------------------------------------------------------------------
// Pivot table
// ---------------------------------------------------------------------------

function PivotTable({ pivotRows, title }: { pivotRows: PivotRow[]; title: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Edition</TableCell>
              {RARITY_ORDER.map((r) => (
                <TableCell key={r} align="right" sx={{ color: RARITY_COLORS[r], fontWeight: 700 }}>
                  {r}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pivotRows.map((row) => (
              <TableRow key={row.edition} hover>
                <TableCell>{row.edition}</TableCell>
                {RARITY_ORDER.map((r) => (
                  <TableCell key={r} align="right">
                    {(row.values[r] ?? 0).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {row.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  rows: CardDistributionRow[];
}

export default function BurnedDistributionContent({ rows }: Props) {
  const { filter } = useCardStatsFilter();
  const { theme } = useTheme();

  const filtered = useMemo(
    () => rows.filter((r) => matchesCardStatsRow(r, filter)),
    [rows, filter]
  );
  const chartData = useMemo(() => buildBurnedBcxChart(filtered), [filtered]);
  const bcxPivot = useMemo(() => buildPivot(filtered, "bcx"), [filtered]);
  const burnedBcxPivot = useMemo(() => buildPivot(filtered, "burnedBcx"), [filtered]);

  const totalBcx = filtered.reduce((s, r) => s + r.bcx, 0);
  const totalBurnedBcx = filtered.reduce((s, r) => s + r.burnedBcx, 0);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Paper variant="outlined" sx={{ flex: "1 1 200px", p: 2, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totalBcx.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total BCX
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: "1 1 200px", p: 2, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {totalBurnedBcx.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Burned BCX
            </Typography>
          </Paper>
        </Box>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Burned BCX by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={chartData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Burned BCX" } },
          }}
          theme={theme}
        />

        <Box sx={{ mt: 3 }}>
          <PivotTable pivotRows={bcxPivot} title="BCX by Edition × Rarity" />
          <PivotTable pivotRows={burnedBcxPivot} title="Burned BCX by Edition × Rarity" />
        </Box>
      </Box>
      <CardStatsFilterDrawer />
    </Box>
  );
}
