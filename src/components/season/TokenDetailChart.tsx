"use client";

/**
 * TokenDetailChart
 *
 * Line chart showing every transaction type for a selected token,
 * across seasons. Uses getSeasonBalancesByToken data.
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { useMemo, useState } from "react";

import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import { useDistinctTokens, useTokenDetail } from "@/hooks/season/useTokenDetail";
import { useLatestSeasonId } from "@/hooks/useLatestSeasonId";
import type { TokenBalanceRow } from "@/lib/backend/actions/season-overview-actions";

// A reasonably distinguishable colour palette for up to ~15 types
const LINE_COLORS = [
  "#1976d2",
  "#388e3c",
  "#f57c00",
  "#7b1fa2",
  "#c62828",
  "#0097a7",
  "#558b2f",
  "#ff6f00",
  "#ad1457",
  "#00695c",
  "#1565c0",
  "#2e7d32",
  "#e65100",
  "#4a148c",
  "#b71c1c",
];

interface Props {
  username?: string;
  theme: AppTheme;
  hideCurrentSeason?: boolean;
}

export default function TokenDetailChart({ username, theme, hideCurrentSeason }: Props) {
  const { tokens, loading: tokensLoading } = useDistinctTokens(username);
  const [selectedToken, setSelectedToken] = useState<string>("");
  const currentSeason = useLatestSeasonId();

  // Pick first token as default once loaded
  const token = selectedToken || tokens[0] || "";

  const { data: rawData, loading: dataLoading } = useTokenDetail(token, username);
  const data =
    hideCurrentSeason && currentSeason
      ? rawData.filter((r) => r.seasonId !== currentSeason)
      : rawData;

  if (tokensLoading) {
    return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />;
  }

  if (tokens.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No token balance data available.
      </Typography>
    );
  }

  return (
    <Box>
      <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
        <InputLabel>Token</InputLabel>
        <Select value={token} label="Token" onChange={(e) => setSelectedToken(e.target.value)}>
          {tokens.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {dataLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TokenLines token={token} rows={data} theme={theme} />
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Inner chart — one line per transaction type
// ---------------------------------------------------------------------------

function TokenLines({
  token,
  rows,
  theme,
}: {
  token: string;
  rows: TokenBalanceRow[];
  theme: AppTheme;
}) {
  // Group rows by type, build per-type series keyed by seasonId
  const series: Data[] = useMemo(() => {
    const byType = new Map<string, Map<number, number>>();
    for (const row of rows) {
      if (!byType.has(row.type)) byType.set(row.type, new Map());
      byType.get(row.type)!.set(row.seasonId, row.amount);
    }

    const allSeasons = Array.from(new Set(rows.map((r) => r.seasonId))).sort((a, b) => a - b);

    return Array.from(byType.entries()).map(([type, seasonMap], idx) => ({
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: type,
      x: allSeasons,
      y: allSeasons.map((s) => seasonMap.get(s) ?? null),
      line: { color: LINE_COLORS[idx % LINE_COLORS.length], width: 1.5 },
      marker: { size: 4 },
      connectgaps: false,
    }));
  }, [rows]);

  if (series.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data for {token}.
      </Typography>
    );
  }

  const layout: Partial<Layout> = {
    title: { text: `${token} — Balance by Type`, font: { size: 14 } },
    xaxis: {
      title: { text: "Season" },
      tickmode: "linear",
      dtick: 5,
    },
    yaxis: {
      title: { text: token },
    },
    height: 420,
    margin: { l: 65, r: 30, t: 40, b: 45 },
    // Legend on the right side for many series
    legend: {
      orientation: "v",
      x: 1.02,
      xanchor: "left",
      y: 1,
      yanchor: "top",
      font: { size: 11 },
    },
  };

  return <PlotlyChart data={series} layout={layout} theme={theme} height={420} />;
}
