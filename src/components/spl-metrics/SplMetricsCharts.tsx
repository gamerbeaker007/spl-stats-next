"use client";

/**
 * SplMetricsCharts
 *
 * Renders four Plotly charts matching the Python version:
 *   - Battle Metrics (battles total + per-format)
 *   - Card Market Metrics (market_vol, market_vol_usd, mkt_cap_usd)
 *   - User Metrics (dau, sign_ups, spellbooks)
 *   - Transactions (tx_total)
 *
 * Vertical join-date lines are overlaid when entries are provided.
 */

import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";

import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import type { JoinDateEntry } from "@/components/spl-metrics/JoinDatePicker";
import type { SplMetricRow } from "@/types/spl/metrics";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METRIC_LABELS: Record<string, string> = {
  battles: "Battles",
  "battles-modern": "Battles Modern",
  "battles-survival": "Battles Survival",
  "battles-wild": "Battles Wild",
  dau: "Daily Active Users",
  dec_rewards: "DEC Rewards",
  market_vol: "Market Volume (DEC)",
  market_vol_usd: "Market Volume (USD)",
  mkt_cap_usd: "Market Cap (USD)",
  sign_ups: "Sign-ups",
  spellbooks: "Spellbooks Sold",
  tx_total: "Total Transactions",
};

const BATTLE_COLORS: Record<string, string> = {
  battles: "#c62828",
  "battles-modern": "#1565c0",
  "battles-wild": "#6a1b9a",
  "battles-survival": "#e65100",
};

// Pool of distinct colors for join-date lines
const JOIN_DATE_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#00bcd4",
  "#4caf50",
  "#ff9800",
  "#795548",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metricLabel(m: string) {
  return METRIC_LABELS[m] ?? m.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build vertical line traces for each join-date entry that has a valid date. */
function joinDateTraces(entries: JoinDateEntry[], yMax: number, yaxisId: string = "y"): Data[] {
  return entries
    .filter((e) => e.joinDate && !e.loading)
    .map((e, i) => ({
      type: "scatter" as const,
      x: [e.joinDate, e.joinDate],
      y: [0, yMax],
      mode: "lines" as const,
      line: {
        color: JOIN_DATE_COLORS[i % JOIN_DATE_COLORS.length],
        width: 2,
        dash: "dot" as const,
      },
      name: `Join: ${e.username}`,
      yaxis: yaxisId,
    }));
}

// ---------------------------------------------------------------------------
// Battle chart
// ---------------------------------------------------------------------------

const BATTLE_METRIC_KEYS = ["battles", "battles-modern", "battles-wild", "battles-survival"];

function BattleChart({
  rows,
  joinEntries,
  theme,
}: {
  rows: SplMetricRow[];
  joinEntries: JoinDateEntry[];
  theme: AppTheme;
}) {
  const data: Data[] = useMemo(() => {
    const filtered = rows.filter((r) => BATTLE_METRIC_KEYS.includes(r.metric));
    const yMax = Math.max(...filtered.map((r) => r.value), 0) * 1.1;
    const series: Data[] = BATTLE_METRIC_KEYS.filter((m) =>
      filtered.some((r) => r.metric === m)
    ).map((m) => ({
      type: "scatter" as const,
      x: filtered.filter((r) => r.metric === m).map((r) => r.date),
      y: filtered.filter((r) => r.metric === m).map((r) => r.value),
      mode: "lines+markers" as const,
      marker: { size: 4, color: BATTLE_COLORS[m] },
      line: { color: BATTLE_COLORS[m] },
      name: metricLabel(m),
    }));
    return [...series, ...joinDateTraces(joinEntries, yMax)];
  }, [rows, joinEntries]);

  const layout: Partial<Layout> = {
    xaxis: { title: { text: "Date" }, tickformat: "%Y-%m-%d" },
    yaxis: { title: { text: "Battles" } },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={420} />;
}

// ---------------------------------------------------------------------------
// Market chart
// ---------------------------------------------------------------------------

const MARKET_METRIC_KEYS = ["mkt_cap_usd", "market_vol_usd", "market_vol"];
const MARKET_COLORS: Record<string, string> = {
  mkt_cap_usd: "#e65100",
  market_vol_usd: "#6a1b9a",
  market_vol: "#1565c0",
};

function MarketChart({
  rows,
  joinEntries,
  theme,
}: {
  rows: SplMetricRow[];
  joinEntries: JoinDateEntry[];
  theme: AppTheme;
}) {
  const data: Data[] = useMemo(() => {
    const yMaxCap =
      Math.max(...rows.filter((r) => r.metric === "mkt_cap_usd").map((r) => r.value), 0) * 1.1;
    const series: Data[] = MARKET_METRIC_KEYS.filter((m) => rows.some((r) => r.metric === m)).map(
      (m) => ({
        type: "scatter" as const,
        x: rows.filter((r) => r.metric === m).map((r) => r.date),
        y: rows.filter((r) => r.metric === m).map((r) => r.value),
        mode: "lines+markers" as const,
        marker: { size: 4, color: MARKET_COLORS[m] },
        line: { color: MARKET_COLORS[m] },
        name: metricLabel(m),
        yaxis:
          m === "market_vol"
            ? ("y3" as const)
            : m === "market_vol_usd"
              ? ("y2" as const)
              : ("y" as const),
      })
    );
    return [...series, ...joinDateTraces(joinEntries, yMaxCap)];
  }, [rows, joinEntries]);

  const layout: Partial<Layout> = {
    xaxis: { title: { text: "Date" }, tickformat: "%Y-%m-%d" },
    yaxis: {
      title: { text: metricLabel("mkt_cap_usd"), font: { color: MARKET_COLORS.mkt_cap_usd } },
      tickfont: { color: MARKET_COLORS.mkt_cap_usd },
    },
    yaxis2: {
      title: { text: metricLabel("market_vol_usd"), font: { color: MARKET_COLORS.market_vol_usd } },
      tickfont: { color: MARKET_COLORS.market_vol_usd },
      overlaying: "y",
      side: "right",
      showgrid: false,
    },
    yaxis3: {
      title: { text: metricLabel("market_vol"), font: { color: MARKET_COLORS.market_vol } },
      tickfont: { color: MARKET_COLORS.market_vol },
      overlaying: "y",
      side: "right",
      showgrid: false,
    },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={420} />;
}

// ---------------------------------------------------------------------------
// User chart
// ---------------------------------------------------------------------------

const USER_METRIC_KEYS = ["dau", "sign_ups", "spellbooks"];
const USER_COLORS: Record<string, string> = {
  dau: "#1565c0",
  sign_ups: "#6a1b9a",
  spellbooks: "#e65100",
};

function UserChart({
  rows,
  joinEntries,
  theme,
}: {
  rows: SplMetricRow[];
  joinEntries: JoinDateEntry[];
  theme: AppTheme;
}) {
  const data: Data[] = useMemo(() => {
    const yMaxSignups =
      Math.max(
        ...rows.filter((r) => ["sign_ups", "spellbooks"].includes(r.metric)).map((r) => r.value),
        0
      ) * 1.1;
    const series: Data[] = USER_METRIC_KEYS.filter((m) => rows.some((r) => r.metric === m)).map(
      (m) => ({
        type: "scatter" as const,
        x: rows.filter((r) => r.metric === m).map((r) => r.date),
        y: rows.filter((r) => r.metric === m).map((r) => r.value),
        mode: "lines+markers" as const,
        marker: { size: 4, color: USER_COLORS[m] },
        line: { color: USER_COLORS[m] },
        connectgaps: m !== "spellbooks",
        name: metricLabel(m),
        yaxis: m === "dau" ? ("y2" as const) : ("y" as const),
      })
    );
    return [...series, ...joinDateTraces(joinEntries, yMaxSignups)];
  }, [rows, joinEntries]);

  const layout: Partial<Layout> = {
    xaxis: { title: { text: "Date" }, tickformat: "%Y-%m-%d" },
    yaxis: { title: { text: "Sign-ups & Spellbooks" } },
    yaxis2: {
      title: { text: "Daily Active Users", font: { color: USER_COLORS.dau } },
      tickfont: { color: USER_COLORS.dau },
      overlaying: "y",
      side: "right",
      showgrid: false,
    },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={420} />;
}

// ---------------------------------------------------------------------------
// Transactions chart
// ---------------------------------------------------------------------------

function TxChart({
  rows,
  joinEntries,
  theme,
}: {
  rows: SplMetricRow[];
  joinEntries: JoinDateEntry[];
  theme: AppTheme;
}) {
  const filtered = rows.filter((r) => r.metric === "tx_total");

  const data: Data[] = useMemo(() => {
    const yMax = Math.max(...filtered.map((r) => r.value), 0) * 1.1;
    const series: Data = {
      type: "scatter" as const,
      x: filtered.map((r) => r.date),
      y: filtered.map((r) => r.value),
      mode: "lines+markers" as const,
      marker: { size: 4, color: "#1565c0" },
      line: { color: "#1565c0" },
      name: "Total Transactions",
    };
    return [series, ...joinDateTraces(joinEntries, yMax)];
  }, [filtered, joinEntries]);

  const layout: Partial<Layout> = {
    xaxis: { title: { text: "Date" }, tickformat: "%Y-%m-%d" },
    yaxis: { title: { text: "Transactions" } },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={420} />;
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export { BattleChart, MarketChart, TxChart, UserChart };
