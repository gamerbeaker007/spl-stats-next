"use client";

import PlotlyChart from "@/components/shared/PlotlyChart";
import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import CardStatsStatHeader from "@/components/card-stats/CardStatsStatHeader";
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

function buildRarityBarData(
  rows: CardDistributionRow[],
  valueKey: keyof CardDistributionRow
): Data[] {
  const grouped: Record<string, Record<string, number>> = {};
  const editionOrder: string[] = [];

  for (const row of rows) {
    if (!grouped[row.editionLabel]) {
      grouped[row.editionLabel] = {};
      editionOrder.push(row.editionLabel);
    }
    grouped[row.editionLabel][row.rarityName] =
      (grouped[row.editionLabel][row.rarityName] ?? 0) + (row[valueKey] as number);
  }

  const editions = [...new Set(editionOrder)];
  return RARITY_ORDER.map((rarity) => ({
    type: "bar",
    name: rarity,
    x: editions,
    y: editions.map((ed) => grouped[ed]?.[rarity] ?? 0),
    marker: { color: RARITY_COLORS[rarity] },
  }));
}

interface Props {
  rows: CardDistributionRow[];
}

export default function CardDistributionContent({ rows }: Props) {
  const { filterRow } = useCardStatsFilter();
  const { theme } = useTheme();

  const filtered = useMemo(() => rows.filter(filterRow), [rows, filterRow]);
  const cardData = useMemo(() => buildRarityBarData(filtered, "numCards"), [filtered]);
  const burnedData = useMemo(() => buildRarityBarData(filtered, "numBurned"), [filtered]);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <CardStatsStatHeader rows={filtered} />

        <Typography variant="h6" sx={{ mb: 1, mt: 2 }}>
          Cards by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={cardData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Cards" } },
          }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Burned by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={burnedData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Burned Cards" } },
          }}
          theme={theme}
        />
      </Box>
      <CardStatsFilterDrawer />
    </Box>
  );
}
