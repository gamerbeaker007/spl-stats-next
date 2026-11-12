"use client";

import type { ChartMetric } from "@/components/portfolio/ChartMetricToggle";
import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import type { CollectionHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { firstDateWithData, PORTFOLIO_CHART_HEIGHT, SERIES_COLORS } from "./chartConstants";

export interface EditionSeries {
  edition: number;
  name: string;
}

interface Props {
  history: CollectionHistoryPoint[];
  /** Every edition with data (fixes each edition's colour regardless of the filter). */
  editions: EditionSeries[];
  /** Editions to draw; empty = all. */
  selected: ReadonlySet<number>;
  metric: ChartMetric;
  theme: AppTheme;
}

export default function CollectionChart({ history, editions, selected, metric, theme }: Props) {
  const traces = useMemo<Data[]>(() => {
    const dates = history.map((p) => p.date);
    const byDate = history.map((p) => new Map(p.editionValues.map((e) => [e.edition, e])));
    const out: Data[] = [];

    editions.forEach(({ edition, name }, idx) => {
      if (selected.size > 0 && !selected.has(edition)) return;
      const color = SERIES_COLORS[idx % SERIES_COLORS.length];
      const showValue = metric !== "qty";

      if (showValue) {
        out.push({
          name,
          legendgroup: name,
          showlegend: true,
          x: dates,
          y: byDate.map((m) => m.get(edition)?.marketValue ?? null),
          type: "scatter",
          mode: "lines",
          line: { color, width: 1.5 },
        } as Data);
      }
      if (metric !== "value") {
        out.push({
          name: showValue ? `${name} BCX` : name,
          legendgroup: name,
          showlegend: !showValue,
          x: dates,
          y: byDate.map((m) => m.get(edition)?.bcx ?? null),
          type: "scatter",
          mode: "lines",
          yaxis: showValue ? "y2" : "y",
          line: { color, dash: "dash", width: 1.5 },
        } as Data);
      }
    });
    return out;
  }, [history, editions, selected, metric]);

  if (history.length === 0 || editions.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No collection history available yet.
      </Typography>
    );
  }

  const firstDataDate = firstDateWithData(history, (p) =>
    p.editionValues.some((ev) => ev.marketValue > 0 || ev.bcx > 0)
  );

  const valueAxis = { title: { text: "Value (USD)" }, tickprefix: "$", tickformat: "~s" };
  const bcxAxis = { title: { text: "BCX" }, tickformat: "~s" };

  const layout = {
    title: { text: "Card Collection Value" },
    xaxis: {
      title: { text: "Date" },
      type: "date",
      range: [firstDataDate, history[history.length - 1].date],
    },
    yaxis: { ...(metric === "qty" ? bcxAxis : valueAxis), showgrid: false },
    ...(metric === "both"
      ? {
          yaxis2: {
            ...bcxAxis,
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
