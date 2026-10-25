"use client";

import { LiveTimestamp } from "@/components/collection/cards/LivePrice";
import { Tooltip, Typography } from "@mui/material";

/** "Prices: <time>" stamp that flashes whenever fresh market data arrives. */
export default function MarketPricesStamp({ fetchedAt }: Readonly<{ fetchedAt?: string | null }>) {
  if (!fetchedAt) return null;
  return (
    <Tooltip title="When these market prices were fetched from Splinterlands">
      <Typography variant="caption" color="text.secondary">
        Prices: <LiveTimestamp value={fetchedAt} />
      </Typography>
    </Tooltip>
  );
}
