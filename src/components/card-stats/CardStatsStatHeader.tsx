"use client";

import type { CardDistributionRow } from "@/types/card-stats";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

interface StatCellProps {
  label: string;
  value: string;
}

function StatCell({ label, value }: StatCellProps) {
  return (
    <Paper variant="outlined" sx={{ flex: "1 1 140px", p: 1.5, textAlign: "center" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

function fmt(n: number): string {
  return n.toLocaleString();
}

interface Props {
  rows: CardDistributionRow[];
}

export default function CardStatsStatHeader({ rows }: Props) {
  const totalCards = rows.reduce((s, r) => s + r.numCards, 0);
  const totalBurned = rows.reduce((s, r) => s + r.numBurned, 0);
  const totalUnbound = rows.reduce((s, r) => s + r.unboundCards, 0);
  const totalBcx = rows.reduce((s, r) => s + r.bcx, 0);
  const totalBurnedBcx = rows.reduce((s, r) => s + r.burnedBcx, 0);
  const totalCp = rows.reduce((s, r) => s + r.cp, 0);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
      <StatCell label="Total Cards" value={fmt(totalCards)} />
      <StatCell label="Burned Cards" value={fmt(totalBurned)} />
      <StatCell label="Unbound Cards" value={fmt(totalUnbound)} />
      <StatCell label="Total BCX" value={fmt(totalBcx)} />
      <StatCell label="Burned BCX" value={fmt(totalBurnedBcx)} />
      <StatCell label="Total CP" value={fmt(totalCp)} />
    </Box>
  );
}
