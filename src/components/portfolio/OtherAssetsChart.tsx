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

type AssetKey = keyof Omit<
  PortfolioHistoryPoint,
  "date" | "totalValue" | "collectionMarketValue" | "collectionListValue" | "editionValues"
>;

interface AssetDef {
  name: string;
  key: AssetKey;
  qtyKey?: AssetKey;
  color: string;
  dash?: "solid" | "dot" | "dash" | "longdash" | "dashdot" | "longdashdot";
}

const ASSET_DEFS: AssetDef[] = [
  { name: "DEC Liquid", key: "decValue", qtyKey: "decQty", color: "#1565c0" },
  {
    name: "DEC Staked",
    key: "decStakedValue",
    qtyKey: "decStakedQty",
    color: "#1565c0",
    dash: "dash",
  },
  { name: "SPS Liquid", key: "spsValue", qtyKey: "spsQty", color: "#6a1b9a" },
  { name: "SPS Staked", key: "spspValue", qtyKey: "spspQty", color: "#6a1b9a", dash: "dash" },
  { name: "Deeds", key: "deedsValue", qtyKey: "deedsQty", color: "#2e7d32" },
  { name: "Land Resources", key: "landResourceValue", qtyKey: "landResourceQty", color: "#558b2f" },
  { name: "Liq. Pool", key: "liqPoolValue", qtyKey: "liqPoolQty", color: "#f57f17" },
  { name: "VOUCHER", key: "voucherValue", qtyKey: "voucherQty", color: "#ad1457" },
  { name: "Credits", key: "creditsValue", qtyKey: "creditsQty", color: "#00695c" },
  { name: "DEC-B", key: "decBValue", qtyKey: "decBQty", color: "#0277bd" },
  { name: "VOUCHER-G", key: "voucherGValue", qtyKey: "voucherGQty", color: "#c62828" },
  { name: "License", key: "licenseValue", qtyKey: "licenseQty", color: "#37474f" },
  { name: "Inventory", key: "inventoryValue", qtyKey: "inventoryQty", color: "#4527a0" },
];

export default function OtherAssetsChart({ history, theme }: Props) {
  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No asset history available yet.
      </Typography>
    );
  }

  const dates = history.map((p) => p.date);

  // Only include assets that have at least one non-zero value
  const activeAssets = ASSET_DEFS.filter((def) => history.some((p) => (p[def.key] as number) > 0));

  const traces: Data[] = [];
  for (const def of activeAssets) {
    // Value on y1 — shown in legend with the asset name
    traces.push({
      name: def.name,
      legendgroup: def.name,
      showlegend: true,
      x: dates,
      y: history.map((p) => p[def.key] as number),
      type: "scatter",
      mode: "lines",
      line: { color: def.color, dash: def.dash ?? "solid", width: 1.5 },
    } as Data);

    // Qty on y2 — hidden from legend, toggled via the group
    if (def.qtyKey) {
      traces.push({
        name: `${def.name} Qty`,
        legendgroup: def.name,
        showlegend: false,
        x: dates,
        y: history.map((p) => p[def.qtyKey!] as number),
        type: "scatter",
        mode: "lines",
        yaxis: "y2",
        line: { color: def.color, dash: "dot", width: 1 },
      } as Data);
    }
  }

  if (traces.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No other asset data available yet.
      </Typography>
    );
  }

  const layout: Partial<Layout> = {
    title: { text: "Other Assets" },
    xaxis: { title: { text: "Date" }, type: "date" },
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
    legend: {
      orientation: "v",
      x: 1.06,
      xanchor: "left",
      y: 1,
      yanchor: "top",
    },
    legendgroupclick: "togglegroup",
    margin: { l: 50, r: 200, t: 40, b: 50 },
  } as Partial<Layout>;

  return (
    <PlotlyChart data={traces} layout={layout} theme={theme} height={PORTFOLIO_CHART_HEIGHT} />
  );
}
