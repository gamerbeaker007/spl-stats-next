"use client";

import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import CardStatsStatHeader from "@/components/card-stats/CardStatsStatHeader";
import PlotlyChart from "@/components/shared/PlotlyChart";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { matchesCardStatsRow } from "@/lib/shared/card-filter-utils";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import { SET_DEFS, getSetForEdition } from "@/lib/shared/edition-utils";
import { RARITY_COLORS, RARITY_ORDER } from "@/lib/shared/rarity-utils";
import type { CardDistributionRow } from "@/types/card-stats";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Data } from "plotly.js";
import { useMemo } from "react";

// Set labels in era order (ordered by SET_DEFS position).
const TIER_ORDER = SET_DEFS.map((s) => s.label);

/**
 * Resolve the set label for a row.
 * For regular editions, uses setName directly (so e.g. Gladius → "Eternal").
 * For cross-era editions (promo=2, reward=3, extra=17), falls back to the card's tier field.
 */
function getRowSetLabel(row: CardDistributionRow): string {
  // Regular edition: look up by setName
  const byEdition = getSetForEdition(row.edition);
  if (byEdition) return byEdition.label;
  // Cross-era edition: resolve via the card's tier discriminator
  const tier = row.tier;
  return SET_DEFS.find((s) => s.tier === tier)?.label ?? "Unknown Set";
}

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
  const { filter } = useCardStatsFilter();
  const { theme } = useTheme();

  const filtered = useMemo(
    () => rows.filter((r) => matchesCardStatsRow(r, filter)),
    [rows, filter]
  );
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
