"use client";

import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import type {
  CumulativeInvestmentPoint,
  PortfolioHistoryPoint,
} from "@/lib/backend/actions/portfolio-actions";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { PORTFOLIO_CHART_HEIGHT } from "./chartConstants";

interface Props {
  history: PortfolioHistoryPoint[];
  cumulativeInvestments: CumulativeInvestmentPoint[];
  theme: AppTheme;
}

export default function PortfolioTotalChart({ history, cumulativeInvestments, theme }: Props) {
  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No historical data available yet.
      </Typography>
    );
  }

  const dates = history.map((p) => p.date);
  const totals = history.map((p) => p.totalValue);

  const traces: Data[] = [
    {
      name: "Total Value",
      x: dates,
      y: totals,
      type: "scatter",
      mode: "lines+markers",
      line: { color: "#1565c0", width: 2 },
    },
  ];

  if (cumulativeInvestments.length > 0) {
    const lastPortfolioDate = dates[dates.length - 1];
    const lastInv = cumulativeInvestments[cumulativeInvestments.length - 1];

    const investX = cumulativeInvestments.map((p) => p.date);
    const investY = cumulativeInvestments.map((p) => p.cumulative);

    // Extend flat to the latest portfolio date if investment line stops earlier
    if (lastInv.date < lastPortfolioDate) {
      investX.push(lastPortfolioDate);
      investY.push(lastInv.cumulative);
    }

    traces.push({
      name: "Invested (cumulative)",
      x: investX,
      y: investY,
      type: "scatter",
      mode: "lines+markers",
      line: { color: "#e64a19", dash: "dash", width: 2 },
    });
  }

  const layout: Partial<Layout> = {
    title: { text: "Portfolio Value vs Investment" },
    xaxis: { title: { text: "Date" }, type: "date" },
    yaxis: {
      title: { text: "USD ($)" },
      tickprefix: "$",
      tickformat: ",.3f",
      showgrid: false,
    },
  };

  return (
    <PlotlyChart data={traces} layout={layout} theme={theme} height={PORTFOLIO_CHART_HEIGHT} />
  );
}
