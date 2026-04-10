"use client";

import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import type { PortfolioHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { PORTFOLIO_CHART_HEIGHT } from "./chartConstants";

interface Props {
  history: PortfolioHistoryPoint[];
  theme: AppTheme;
}

// Cycling colour palette for inventory items
const ITEM_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#1f77b4",
  "#2ca02c",
];

export default function InventoryChart({ history, theme }: Props) {
  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No inventory history available yet.
      </Typography>
    );
  }

  // Collect all item names that have non-zero value or qty at some point
  const allNames = new Set<string>();
  for (const p of history) {
    for (const inv of p.inventoryDetails) {
      if (inv.value > 0 || inv.qty > 0) allNames.add(inv.name);
    }
  }

  if (allNames.size === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No inventory data available yet.
      </Typography>
    );
  }

  const dates = history.map((p) => p.date);

  // Find earliest date with any inventory data
  let firstDataDate = dates[0];
  for (let i = 0; i < history.length; i++) {
    if (history[i].inventoryDetails.some((d) => d.value > 0 || d.qty > 0)) {
      firstDataDate = dates[i];
      break;
    }
  }

  const sortedNames = Array.from(allNames).sort();
  const traces: Data[] = [];

  sortedNames.forEach((name, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length];

    // Value on y1 — shown in legend with the item name
    traces.push({
      name,
      legendgroup: name,
      showlegend: true,
      x: dates,
      y: history.map((p) => p.inventoryDetails.find((d) => d.name === name)?.value ?? null),
      type: "scatter",
      mode: "lines+markers",
      line: { color, width: 1.5 },
    } as Data);

    // Qty on y2 (dotted) — hidden from legend, toggled via the group
    traces.push({
      name: `${name} Qty`,
      legendgroup: name,
      showlegend: false,
      x: dates,
      y: history.map((p) => p.inventoryDetails.find((d) => d.name === name)?.qty ?? null),
      type: "scatter",
      mode: "lines+markers",
      yaxis: "y2",
      line: { color, dash: "dot", width: 1 },
    } as Data);
  });

  const layout = {
    title: { text: "Inventory" },
    xaxis: {
      title: { text: "Date" },
      type: "date",
      range: [firstDataDate, dates[dates.length - 1]],
    },
    yaxis: {
      title: { text: "Value (USD)" },
      tickprefix: "$",
      tickformat: ",.0f",
      showgrid: false,
    },
    yaxis2: {
      title: { text: "Quantity" },
      overlaying: "y" as const,
      side: "right" as const,
      showgrid: false,
      tickformat: ",.0f",
    },
    legendgroupclick: "togglegroup",
  } as Partial<Layout>;

  return (
    <PlotlyChart data={traces} layout={layout} theme={theme} height={PORTFOLIO_CHART_HEIGHT} />
  );
}
