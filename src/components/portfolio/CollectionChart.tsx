"use client";

import PlotlyChart, { getPlotlyThemeLayout, type AppTheme } from "@/components/shared/PlotlyChart";
import type { PortfolioHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import { getEditionLabel } from "@/lib/shared/edition-utils";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { PORTFOLIO_CHART_HEIGHT } from "./chartConstants";

interface Props {
  history: PortfolioHistoryPoint[];
  theme: AppTheme;
}

// Cycling palette — one colour per edition, BCX lines share same colour but dashed on y2
const EDITION_COLORS = [
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
];

function editionName(edition: number): string {
  return getEditionLabel(edition) ?? `Ed ${edition}`;
}

export default function CollectionChart({ history, theme }: Props) {
  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No collection history available yet.
      </Typography>
    );
  }

  const dates = history.map((p) => p.date);

  const traces: Data[] = [];

  // Collect all editions that have at least one non-zero value across history
  const allEditions = new Set<number>();
  for (const p of history) {
    for (const ev of p.editionValues) {
      if (ev.marketValue > 0 || ev.bcx > 0) allEditions.add(ev.edition);
    }
  }

  // Find the earliest date that has actual edition data (skip leading nulls)
  let firstDataDate = dates[0];
  for (let i = 0; i < history.length; i++) {
    if (
      history[i].editionValues.some(
        (ev) => allEditions.has(ev.edition) && (ev.marketValue > 0 || ev.bcx > 0)
      )
    ) {
      firstDataDate = dates[i];
      break;
    }
  }

  let colorIdx = 0;
  for (const edId of Array.from(allEditions).sort((a, b) => a - b)) {
    const color = EDITION_COLORS[colorIdx % EDITION_COLORS.length];
    colorIdx++;
    const name = editionName(edId);

    // Market value on y1 — shown in legend with the edition name
    traces.push({
      name,
      legendgroup: name,
      showlegend: true,
      x: dates,
      y: history.map((p) => p.editionValues.find((e) => e.edition === edId)?.marketValue ?? null),
      type: "scatter",
      mode: "lines",
      line: { color, width: 1.5 },
    } as Data);

    // BCX on y2 (dashed) — hidden from legend, toggled via the group
    traces.push({
      name: `${name} BCX`,
      legendgroup: name,
      showlegend: false,
      x: dates,
      y: history.map((p) => p.editionValues.find((e) => e.edition === edId)?.bcx ?? null),
      type: "scatter",
      mode: "lines",
      yaxis: "y2",
      line: { color, dash: "dash", width: 1.5 },
    } as Data);
  }

  const themeLayout = getPlotlyThemeLayout(theme);
  const layout = {
    title: { text: "Card Collection Value" },
    xaxis: {
      title: { text: "Date" },
      type: "date",
      range: [firstDataDate, dates[dates.length - 1]],
    },
    yaxis: {
      title: { text: "Value (USD)" },
      tickprefix: "$",
      tickformat: ",.0f",
      gridcolor: themeLayout.xaxis?.gridcolor,
      showgrid: false,
    },
    yaxis2: {
      title: { text: "BCX" },
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
