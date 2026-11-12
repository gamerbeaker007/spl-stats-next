"use client";

import type { ChartMetric } from "@/components/portfolio/ChartMetricToggle";
import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import type { InventoryHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import {
  firstDateWithData,
  MAX_LEGEND_ITEMS,
  PORTFOLIO_CHART_HEIGHT,
  SERIES_COLORS,
} from "./chartConstants";

interface Props {
  history: InventoryHistoryPoint[];
  /** Every item name with data, sorted (fixes each item's colour regardless of the filter). */
  allNames: string[];
  /** Item names to draw (already filtered). */
  visibleNames: ReadonlySet<string>;
  metric: ChartMetric;
  theme: AppTheme;
}

export default function InventoryChart({ history, allNames, visibleNames, metric, theme }: Props) {
  const traces = useMemo<Data[]>(() => {
    const dates = history.map((p) => p.date);
    const byDate = history.map((p) => new Map(p.items.map((item) => [item.name, item])));
    const out: Data[] = [];

    allNames.forEach((name, idx) => {
      if (!visibleNames.has(name)) return;
      const color = SERIES_COLORS[idx % SERIES_COLORS.length];
      const showValue = metric !== "qty";

      if (showValue) {
        out.push({
          name,
          legendgroup: name,
          showlegend: true,
          x: dates,
          y: byDate.map((m) => m.get(name)?.value ?? null),
          type: "scatter",
          mode: "lines+markers",
          line: { color, width: 1.5 },
        } as Data);
      }
      if (metric !== "value") {
        out.push({
          name: showValue ? `${name} Qty` : name,
          legendgroup: name,
          showlegend: !showValue,
          x: dates,
          y: byDate.map((m) => m.get(name)?.qty ?? null),
          type: "scatter",
          mode: "lines+markers",
          yaxis: showValue ? "y2" : "y",
          line: { color, dash: "dot", width: 1 },
        } as Data);
      }
    });
    return out;
  }, [history, allNames, visibleNames, metric]);

  if (history.length === 0 || allNames.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No inventory history available yet.
      </Typography>
    );
  }

  if (visibleNames.size === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No inventory items match the selected filter.
      </Typography>
    );
  }

  const firstDataDate = firstDateWithData(history, (p) => p.items.length > 0);
  // Many items make the legend unreadable — identify series by hover instead.
  const showLegend = visibleNames.size <= MAX_LEGEND_ITEMS;

  const valueAxis = { title: { text: "Value (USD)" }, tickprefix: "$", tickformat: "~s" };
  const qtyAxis = { title: { text: "Quantity" }, tickformat: "~s" };

  const layout = {
    title: { text: "Inventory" },
    showlegend: showLegend,
    hovermode: "closest",
    xaxis: {
      title: { text: "Date" },
      type: "date",
      range: [firstDataDate, history[history.length - 1].date],
    },
    yaxis: { ...(metric === "qty" ? qtyAxis : valueAxis), showgrid: false },
    ...(metric === "both"
      ? {
          yaxis2: {
            ...qtyAxis,
            overlaying: "y" as const,
            side: "right" as const,
            showgrid: false,
          },
        }
      : {}),
    legendgroupclick: "togglegroup",
  } as Partial<Layout>;

  return (
    <PlotlyChart data={traces} layout={layout} theme={theme} height={PORTFOLIO_CHART_HEIGHT} />
  );
}
