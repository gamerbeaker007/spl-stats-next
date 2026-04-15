"use client";

import PlotlyChart from "@/components/shared/PlotlyChart";
import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import type { CardDistributionRow } from "@/types/card-stats";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Data } from "plotly.js";
import { useMemo } from "react";

const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];
const RARITY_COLORS: Record<string, string> = {
  Common: "#9e9e9e",
  Rare: "#2196F3",
  Epic: "#9C27B0",
  Legendary: "#FF9800",
};
const FOIL_COLORS: Record<string, string> = {
  regular: "#607d8b",
  gold: "#ffc107",
  black: "#455a64",
};
const FOIL_LABELS: Record<string, string> = { regular: "Regular", gold: "Gold", black: "Black" };

function buildTotalCpByEdition(rows: CardDistributionRow[]): Data[] {
  const map = new Map<string, number>();
  const order: string[] = [];
  for (const row of rows) {
    if (!map.has(row.editionLabel)) {
      map.set(row.editionLabel, 0);
      order.push(row.editionLabel);
    }
    map.set(row.editionLabel, (map.get(row.editionLabel) ?? 0) + row.cp);
  }
  const editions = [...new Set(order)];
  return [{ type: "bar", x: editions, y: editions.map((ed) => map.get(ed) ?? 0), marker: { color: "#42a5f5" } }];
}

function buildCpByEditionAndRarity(rows: CardDistributionRow[]): Data[] {
  const grouped: Record<string, Record<string, number>> = {};
  const order: string[] = [];
  for (const row of rows) {
    if (!grouped[row.editionLabel]) { grouped[row.editionLabel] = {}; order.push(row.editionLabel); }
    grouped[row.editionLabel][row.rarityName] = (grouped[row.editionLabel][row.rarityName] ?? 0) + row.cp;
  }
  const editions = [...new Set(order)];
  return RARITY_ORDER.map((rarity) => ({
    type: "bar", name: rarity,
    x: editions, y: editions.map((ed) => grouped[ed]?.[rarity] ?? 0),
    marker: { color: RARITY_COLORS[rarity] },
  }));
}

function buildCpByEditionAndFoil(rows: CardDistributionRow[]): Data[] {
  const grouped: Record<string, Record<string, number>> = {};
  const order: string[] = [];
  for (const row of rows) {
    if (!grouped[row.editionLabel]) { grouped[row.editionLabel] = {}; order.push(row.editionLabel); }
    grouped[row.editionLabel][row.foilCategory] = (grouped[row.editionLabel][row.foilCategory] ?? 0) + row.cp;
  }
  const editions = [...new Set(order)];
  return (["regular", "gold", "black"] as const).map((cat) => ({
    type: "bar", name: FOIL_LABELS[cat],
    x: editions, y: editions.map((ed) => grouped[ed]?.[cat] ?? 0),
    marker: { color: FOIL_COLORS[cat] },
  }));
}

interface Props {
  rows: CardDistributionRow[];
}

export default function CpDistributionContent({ rows }: Props) {
  const { filterRow } = useCardStatsFilter();
  const { theme } = useTheme();

  const filtered = useMemo(() => rows.filter(filterRow), [rows, filterRow]);
  const totalCpByEdition = useMemo(() => buildTotalCpByEdition(filtered), [filtered]);
  const cpByRarity = useMemo(() => buildCpByEditionAndRarity(filtered), [filtered]);
  const cpByFoil = useMemo(() => buildCpByEditionAndFoil(filtered), [filtered]);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Total CP by Edition
        </Typography>
        <PlotlyChart
          data={totalCpByEdition}
          layout={{ xaxis: { title: { text: "Edition" } }, yaxis: { title: { text: "Total CP" } }, showlegend: false }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          CP by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={cpByRarity}
          layout={{ barmode: "group", xaxis: { title: { text: "Edition" } }, yaxis: { title: { text: "CP" } } }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          CP by Edition &amp; Foil
        </Typography>
        <PlotlyChart
          data={cpByFoil}
          layout={{ barmode: "group", xaxis: { title: { text: "Edition" } }, yaxis: { title: { text: "CP" } } }}
          theme={theme}
        />
      </Box>
      <CardStatsFilterDrawer />
    </Box>
  );
}
