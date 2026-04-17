"use client";

import PlotlyChart from "@/components/shared/PlotlyChart";
import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import CardStatsStatHeader from "@/components/card-stats/CardStatsStatHeader";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import { SET_DEFS, getSetForEdition } from "@/lib/shared/edition-utils";
import type { CardDistributionRow } from "@/types/card-stats";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Data } from "plotly.js";
import { useMemo } from "react";

const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];

// Tier chart — set labels in era order, Eternal last.
const TIER_ORDER = [...SET_DEFS.filter((s) => s.tier !== null).map((s) => s.label), "Eternal"];

/** Resolve the set/era label for a row, falling back to edition when tier is absent. */
function getRowSetLabel(row: CardDistributionRow): string {
  const tier = row.tier ?? getSetForEdition(row.edition)?.tier ?? null;
  if (tier === null) return "Unknown Set";
  return SET_DEFS.find((s) => s.tier === tier)?.label ?? `Tier ${tier}`;
}
const RARITY_COLORS: Record<string, string> = {
  Common: "#9e9e9e",
  Rare: "#2196F3",
  Epic: "#9C27B0",
  Legendary: "#FF9800",
};

function buildTierRarityData(
  rows: CardDistributionRow[],
  valueKey: keyof CardDistributionRow
): Data[] {
  const grouped: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    const setLabel = getRowSetLabel(row);
    if (!grouped[setLabel]) grouped[setLabel] = {};
    grouped[setLabel][row.rarityName] =
      (grouped[setLabel][row.rarityName] ?? 0) + (row[valueKey] as number);
  }

  return RARITY_ORDER.map((rarity) => ({
    type: "bar",
    name: rarity,
    x: TIER_ORDER,
    y: TIER_ORDER.map((t) => grouped[t]?.[rarity] ?? 0),
    marker: { color: RARITY_COLORS[rarity] },
  }));
}

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
  const tierCardData = useMemo(() => buildTierRarityData(filtered, "numCards"), [filtered]);
  const tierBurnedData = useMemo(() => buildTierRarityData(filtered, "numBurned"), [filtered]);

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

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Cards by Set &amp; Rarity
        </Typography>
        <PlotlyChart
          data={tierCardData}
          layout={{
            barmode: "stack",
            xaxis: { title: { text: "Set" } },
            yaxis: { title: { text: "Cards" } },
          }}
          theme={theme}
        />

        <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
          Burned by Set &amp; Rarity
        </Typography>
        <PlotlyChart
          data={tierBurnedData}
          layout={{
            barmode: "stack",
            xaxis: { title: { text: "Set" } },
            yaxis: { title: { text: "Burned Cards" } },
          }}
          theme={theme}
        />
      </Box>
      <CardStatsFilterDrawer />
    </Box>
  );
}
