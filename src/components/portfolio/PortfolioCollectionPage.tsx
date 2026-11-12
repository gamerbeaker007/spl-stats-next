"use client";

import ChartFilterChips from "@/components/portfolio/ChartFilterChips";
import ChartMetricToggle, { type ChartMetric } from "@/components/portfolio/ChartMetricToggle";
import CollectionChart, { type EditionSeries } from "@/components/portfolio/CollectionChart";
import PortfolioDataState from "@/components/portfolio/PortfolioDataState";
import { useCollectionHistory } from "@/hooks/portfolio/usePortfolioHistory";
import type { CollectionHistoryPoint } from "@/lib/backend/actions/portfolio-actions";
import { usePortfolio } from "@/lib/frontend/context/PortfolioContext";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import { getEditionIconUrl, getEditionLabel } from "@/lib/shared/edition-utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

function collectEditions(history: CollectionHistoryPoint[]): EditionSeries[] {
  const editions = new Set<number>();
  for (const p of history) {
    for (const ev of p.editionValues) {
      if (ev.marketValue > 0 || ev.bcx > 0) editions.add(ev.edition);
    }
  }
  return Array.from(editions)
    .sort((a, b) => a - b)
    .map((edition) => ({ edition, name: getEditionLabel(edition) ?? `Ed ${edition}` }));
}

function CollectionHistorySection({ history }: { history: CollectionHistoryPoint[] }) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metric, setMetric] = useState<ChartMetric>("both");

  const editions = useMemo(() => collectEditions(history), [history]);
  const options = useMemo(
    () =>
      editions.map((e) => ({
        key: String(e.edition),
        label: e.name,
        iconUrl: getEditionIconUrl(e.edition),
      })),
    [editions]
  );
  // Ignore selected editions that are no longer in the data (account selection changed).
  const selectedEditions = useMemo(
    () => new Set(editions.filter((e) => selected.has(String(e.edition))).map((e) => e.edition)),
    [editions, selected]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <ChartFilterChips
            label="Filter by edition"
            options={options}
            selected={selected}
            onChange={setSelected}
          />
        </Box>
        <ChartMetricToggle value={metric} onChange={setMetric} qtyLabel="BCX" />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Per-edition market value (left Y) and BCX count (right Y, dashed). Click a legend entry to
        toggle it.
      </Typography>
      <CollectionChart
        history={history}
        editions={editions}
        selected={selectedEditions}
        metric={metric}
        theme={theme}
      />
    </Stack>
  );
}

/** /portfolio/collection — per-edition card collection value + BCX history. */
export default function PortfolioCollectionPage() {
  const { selectedAccounts } = usePortfolio();
  const { data, loading, error } = useCollectionHistory(selectedAccounts);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Card Collection History
      </Typography>
      <PortfolioDataState data={data} loading={loading} error={error}>
        {(history) => <CollectionHistorySection history={history} />}
      </PortfolioDataState>
    </Box>
  );
}
