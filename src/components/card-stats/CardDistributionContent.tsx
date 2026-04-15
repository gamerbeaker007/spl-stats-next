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
  const regularRows = useMemo(
    () => filtered.filter((r) => r.foilCategory === "regular"),
    [filtered]
  );
  const goldRows = useMemo(() => filtered.filter((r) => r.foilCategory === "gold"), [filtered]);

  const regularCardData = useMemo(() => buildRarityBarData(regularRows, "numCards"), [regularRows]);
  const goldCardData = useMemo(() => buildRarityBarData(goldRows, "numCards"), [goldRows]);
  const regularBurnedData = useMemo(
    () => buildRarityBarData(regularRows, "numBurned"),
    [regularRows]
  );
  const goldBurnedData = useMemo(() => buildRarityBarData(goldRows, "numBurned"), [goldRows]);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <CardStatsStatHeader rows={filtered} />

        <Typography variant="h6" sx={{ mb: 1, mt: 2 }}>
          Regular Foil — Cards by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={regularCardData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Cards" } },
          }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Regular Foil — Burned by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={regularBurnedData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Burned Cards" } },
          }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Gold Foil — Cards by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={goldCardData}
          layout={{
            barmode: "group",
            xaxis: { title: { text: "Edition" } },
            yaxis: { title: { text: "Cards" } },
          }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Gold Foil — Burned by Edition &amp; Rarity
        </Typography>
        <PlotlyChart
          data={goldBurnedData}
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
