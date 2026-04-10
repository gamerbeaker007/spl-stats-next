"use client";

/**
 * LeaderboardHistoryChart
 *
 * All formats rendered side-by-side in a 2×2 grid.
 * Each column = one format, two stacked charts per column:
 *   Top    — Rating over seasons (line) + max-rating (dashed)
 *   Bottom — Battles (bar, left y) + Win% (line, right y)
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { type Data, type Layout } from "plotly.js";
import { useMemo } from "react";

import PlotlyChart, { type AppTheme } from "@/components/shared/PlotlyChart";
import { useLeaderboardHistory } from "@/hooks/season/useLeaderboardHistory";
import type { LeaderboardSeasonPoint } from "@/lib/backend/actions/season-overview-actions";

const FORMATS = ["wild", "modern", "foundation", "survival"] as const;
type Format = (typeof FORMATS)[number];

interface Props {
  username?: string;
  theme: AppTheme;
}

export default function LeaderboardHistoryChart({ username, theme }: Props) {
  const { data, loading } = useLeaderboardHistory(username);

  const byFormat = useMemo(() => {
    const map = new Map<Format, LeaderboardSeasonPoint[]>();
    for (const f of FORMATS) {
      map.set(
        f,
        data.filter((d) => d.format === f).sort((a, b) => a.seasonId - b.seasonId)
      );
    }
    return map;
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const hasAny = FORMATS.some((f) => (byFormat.get(f)?.length ?? 0) > 0);
  if (!hasAny) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No leaderboard data available.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {FORMATS.map((format) => {
        const rows = byFormat.get(format) ?? [];
        if (rows.length === 0) return null;
        return (
          <Grid key={format} size={{ xs: 12, md: 6 }}>
            <Typography
              variant="subtitle2"
              sx={{ textTransform: "capitalize", mb: 0.5, fontWeight: 600 }}
            >
              {format}
            </Typography>
            <RatingChart rows={rows} theme={theme} />
            <Box sx={{ mt: 1 }} />
            <BattlesChart rows={rows} theme={theme} />
          </Grid>
        );
      })}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Rating chart
// ---------------------------------------------------------------------------

function RatingChart({ rows, theme }: { rows: LeaderboardSeasonPoint[]; theme: AppTheme }) {
  const seasons = rows.map((r) => r.seasonId);
  const ratings = rows.map((r) => r.rating);
  const maxRatings = rows.map((r) => r.maxRating);
  const data: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Rating",
      x: seasons,
      y: ratings,
      line: { color: "#1976d2", width: 2 },
      marker: { size: 4 },
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Max Rating",
      x: seasons,
      y: maxRatings,
      line: { color: "#42a5f5", width: 1.5, dash: "dot" },
      marker: { size: 3 },
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: "Rating", font: { size: 13 } },
    xaxis: { tickmode: "linear", dtick: 5 },
    yaxis: { title: { text: "Rating" } },
    height: 240,
    margin: { l: 55, r: 20, t: 35, b: 35 },
    legend: { orientation: "h", x: 0, y: 1.15, font: { size: 11 } },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={240} />;
}

// ---------------------------------------------------------------------------
// Battles + Win% chart
// ---------------------------------------------------------------------------

function BattlesChart({ rows, theme }: { rows: LeaderboardSeasonPoint[]; theme: AppTheme }) {
  const seasons = rows.map((r) => r.seasonId);
  const battles = rows.map((r) => r.battles ?? 0);
  const winPct = rows.map((r) => {
    const b = r.battles ?? 0;
    const w = r.wins ?? 0;
    return b > 0 ? Math.round((w / b) * 1000) / 10 : null;
  });
  const data: Data[] = [
    {
      type: "bar",
      name: "Battles",
      x: seasons,
      y: battles,
      marker: { color: "#1976d2", opacity: 0.7 },
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "lines+markers",
      name: "Win %",
      x: seasons,
      y: winPct,
      line: { color: "#f57c00", width: 2 },
      marker: { size: 4 },
      yaxis: "y2",
    },
  ];

  const layout: Partial<Layout> = {
    title: { text: "Battles & Win Rate", font: { size: 13 } },
    xaxis: { tickmode: "linear", dtick: 5 },
    yaxis: { title: { text: "Battles" } },
    yaxis2: {
      title: { text: "Win %" },
      overlaying: "y",
      side: "right",
      ticksuffix: "%",
      gridcolor: "rgba(0,0,0,0)",
      rangemode: "tozero",
    },
    legend: { orientation: "h", x: 0, y: 1.15, font: { size: 11 } },
    height: 240,
    margin: { l: 55, r: 55, t: 35, b: 35 },
  };

  return <PlotlyChart data={data} layout={layout} theme={theme} height={240} />;
}
