"use client";

/**
 * BalanceEarningsChart
 *
 * One line chart per token showing total earnings per season.
 * Only whitelisted transaction types are summed (Python parity).
 * Empty seasons are filled with 0; the series always extends to the current season.
 * Tokens: DEC, MERITS, GLINT, SPS (UNCLAIMED_SPS merged into SPS).
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Data, Layout } from "plotly.js";
import { useMemo } from "react";
import { MdInfoOutline } from "react-icons/md";

import PlotlyChart, { getPlotlyThemeLayout, type AppTheme } from "@/components/shared/PlotlyChart";
import { useSeasonEarnings } from "@/hooks/season/useSeasonEarnings";
import { useLatestSeasonId } from "@/hooks/useLatestSeasonId";
import type { EarningsSummaryPoint } from "@/lib/backend/actions/season-overview-actions";
import { TOKEN_TYPE_FILTERS } from "@/lib/shared/season-constants";

const DISPLAY_TOKENS = ["DEC", "MERITS", "GLINT", "SPS"] as const;
type DisplayToken = (typeof DISPLAY_TOKENS)[number];

const TOKEN_COLORS: Record<DisplayToken, string> = {
  DEC: "#1565c0",
  MERITS: "#6a1b9a",
  GLINT: "#f57f17",
  SPS: "#2e7d32",
};

/** Build a filled array from minSeason..maxSeason with 0 for missing entries. */
function fillSeasons(
  rows: EarningsSummaryPoint[],
  minSeason: number,
  maxSeason: number
): { seasons: number[]; totals: number[] } {
  const bySeasonId = new Map(rows.map((r) => [r.seasonId, r.total]));
  const seasons: number[] = [];
  const totals: number[] = [];
  for (let s = minSeason; s <= maxSeason; s++) {
    seasons.push(s);
    totals.push(bySeasonId.get(s) ?? 0);
  }
  return { seasons, totals };
}

interface Props {
  username?: string;
  theme: AppTheme;
}

export default function BalanceEarningsChart({ username, theme }: Props) {
  const { data, loading } = useSeasonEarnings(username);
  const currentSeason = useLatestSeasonId();

  // Merge UNCLAIMED_SPS into SPS
  const merged = useMemo<EarningsSummaryPoint[]>(() => {
    const map = new Map<string, EarningsSummaryPoint>();
    for (const row of data) {
      const token = row.token === "UNCLAIMED_SPS" ? "SPS" : row.token;
      const key = `${row.seasonId}:${token}`;
      if (!map.has(key)) map.set(key, { seasonId: row.seasonId, token, total: 0 });
      map.get(key)!.total += row.total;
    }
    return Array.from(map.values());
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (merged.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No balance earnings data available.
      </Typography>
    );
  }

  const allSeasonIds = merged.map((r) => r.seasonId);
  const minSeason = Math.min(...allSeasonIds);
  const maxSeason = currentSeason ?? Math.max(...allSeasonIds);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {DISPLAY_TOKENS.map((token) => {
        const rows = merged.filter((r) => r.token === token);
        if (rows.length === 0) return null;
        return (
          <TokenLineChart
            key={token}
            token={token}
            rows={rows}
            minSeason={minSeason}
            maxSeason={maxSeason}
            theme={theme}
          />
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Single-token line chart
// ---------------------------------------------------------------------------

function TokenLineChart({
  token,
  rows,
  minSeason,
  maxSeason,
  theme,
}: {
  token: DisplayToken;
  rows: EarningsSummaryPoint[];
  minSeason: number;
  maxSeason: number;
  theme: AppTheme;
}) {
  const themeLayout = getPlotlyThemeLayout(theme);
  const { seasons, totals } = fillSeasons(rows, minSeason, maxSeason);

  const includedTypes = TOKEN_TYPE_FILTERS[token];
  const tooltipText = includedTypes
    ? `Included types:\n${includedTypes.join(", ")}`
    : "All transaction types included.";

  const data: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      name: token,
      x: seasons,
      y: totals,
      line: { color: TOKEN_COLORS[token], width: 2 },
      marker: { size: 4 },
      fill: "tozeroy",
      fillcolor: TOKEN_COLORS[token] + "22",
    },
  ];

  const layout: Partial<Layout> = {
    ...themeLayout,
    xaxis: {
      ...themeLayout.xaxis,
      title: { text: "Season" },
      tickmode: "linear",
      dtick: 5,
      range: [minSeason - 0.5, maxSeason + 0.5],
    },
    yaxis: {
      ...themeLayout.yaxis,
      title: { text: token },
      rangemode: "tozero",
    },
    showlegend: false,
    height: 260,
    margin: { l: 65, r: 20, t: 16, b: 45 },
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {token} Earnings per Season
        </Typography>
        <Tooltip
          title={<Box sx={{ whiteSpace: "pre-line", fontSize: "0.75rem" }}>{tooltipText}</Box>}
          arrow
          placement="right"
        >
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.secondary",
              cursor: "default",
            }}
          >
            <MdInfoOutline size={16} />
          </Box>
        </Tooltip>
      </Box>
      <PlotlyChart data={data} layout={layout} theme={theme} height={260} />
    </Box>
  );
}
