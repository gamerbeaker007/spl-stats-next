"use client";

import PlotlyChart, { getPlotlyThemeLayout, type AppTheme } from "@/components/shared/PlotlyChart";
import type { PortfolioHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { PORTFOLIO_CHART_HEIGHT } from "./chartConstants";

interface Props {
  history: PortfolioHistoryPoint[];
  theme: AppTheme;
}

export default function SpsChart({ history, theme }: Props) {
  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No SPS history available yet.
      </Typography>
    );
  }

  const hasSpsData = history.some((p) => p.spsValue > 0 || p.spspValue > 0);
  if (!hasSpsData) {
    return (
      <Typography variant="body2" color="text.secondary">
        No SPS data available yet.
      </Typography>
    );
  }

  const dates = history.map((p) => p.date);

  const traces: Data[] = [
    // ---- SPS group (liquid) ----
    {
      name: "Value",
      legendgroup: "SPS",
      legendgrouptitle: { text: "SPS" },
      x: dates,
      y: history.map((p) => p.spsValue),
      type: "scatter",
      mode: "lines",
      line: { color: "#7b1fa2", width: 2 },
    } as Data,
    {
      name: "Quantity",
      legendgroup: "SPS",
      x: dates,
      y: history.map((p) => p.spsQty),
      type: "scatter",
      mode: "lines",
      yaxis: "y2",
      line: { color: "#7b1fa2", dash: "dot", width: 1.5 },
    } as Data,
    // ---- SPSP group (staked) ----
    {
      name: "Value",
      legendgroup: "SPSP (Staked)",
      legendgrouptitle: { text: "SPSP (Staked)" },
      x: dates,
      y: history.map((p) => p.spspValue),
      type: "scatter",
      mode: "lines",
      line: { color: "#ab47bc", width: 2 },
    } as Data,
    {
      name: "Quantity",
      legendgroup: "SPSP (Staked)",
      x: dates,
      y: history.map((p) => p.spspQty),
      type: "scatter",
      mode: "lines",
      yaxis: "y2",
      line: { color: "#ab47bc", dash: "dot", width: 1.5 },
    } as Data,
  ];

  const themeLayout = getPlotlyThemeLayout(theme);
  const layout = {
    title: { text: "SPS & Staked SPS" },
    xaxis: { title: { text: "Date" }, type: "date" },
    yaxis: {
      title: { text: "Value (USD)" },
      tickprefix: "$",
      tickformat: ",.2f",
      gridcolor: themeLayout.xaxis?.gridcolor,
      gridwidth: 0.5,
      showgrid: false,
    },
    yaxis2: {
      title: { text: "Quantity (SPS)" },
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
