"use client";

import { formatPct, pctChange, pctColor } from "@/lib/shared/card-watch-utils";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";

function formatUsd(value: number | undefined): string {
  return value && value > 0 ? `$${value.toFixed(3)}` : "-";
}

function WatchTooltip({
  watch,
  priceInfo,
}: Readonly<{ watch: CardWatch; priceInfo?: MarketPriceInfo }>) {
  const rows = [
    { label: "1 CC", watched: watch.lowPriceAtWatch, current: priceInfo?.lowPrice },
    { label: "Price/CC", watched: watch.lowPriceBcxAtWatch, current: priceInfo?.lowPriceBcx },
  ];

  return (
    <Box>
      <Box
        component="table"
        sx={{ borderCollapse: "collapse", "& td, & th": { px: 0.75, textAlign: "right" } }}
      >
        <thead>
          <tr>
            <th />
            <th>Watched</th>
            <th>Current</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pct = pctChange(row.watched, row.current);
            return (
              <tr key={row.label}>
                <Box component="td" sx={{ textAlign: "left !important" }}>
                  {row.label}
                </Box>
                <td>{formatUsd(row.watched)}</td>
                <td>{formatUsd(row.current)}</td>
                <Box component="td" sx={{ color: pct === null ? undefined : pctColor(pct) }}>
                  {pct === null ? "-" : formatPct(pct)}
                </Box>
              </tr>
            );
          })}
        </tbody>
      </Box>
      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
        Watched since {new Date(watch.watchedAt).toLocaleString()}
      </Typography>
    </Box>
  );
}

/** Heart toggle for a card + foil; hover shows the watched → current comparison. */
export function WatchButton({
  watch,
  priceInfo,
  onToggle,
}: Readonly<{
  watch?: CardWatch;
  priceInfo?: MarketPriceInfo;
  onToggle: () => void;
}>) {
  return (
    <Tooltip title={watch ? <WatchTooltip watch={watch} priceInfo={priceInfo} /> : "Watch"} arrow>
      <IconButton
        size="small"
        aria-label={watch ? "Unwatch card" : "Watch card"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        sx={{ color: watch ? "error.main" : "text.secondary" }}
      >
        {watch ? <MdFavorite size={13} /> : <MdFavoriteBorder size={13} />}
      </IconButton>
    </Tooltip>
  );
}
