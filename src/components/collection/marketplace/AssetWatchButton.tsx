"use client";

import { formatPct, pctChange, pctColor } from "@/lib/shared/card-watch-utils";
import type { AssetWatch } from "@/types/asset-watch";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";

/** Heart toggle for a non-card item; hover shows the watched → current price change. */
export default function AssetWatchButton({
  watch,
  currentPriceUsd,
  onToggle,
}: Readonly<{
  watch?: AssetWatch;
  currentPriceUsd?: number;
  onToggle: () => void;
}>) {
  const pct = watch ? pctChange(watch.priceAtWatch, currentPriceUsd) : null;
  const title = watch ? (
    <Box>
      <Typography variant="caption" display="block">
        Watched: {watch.priceAtWatch > 0 ? `$${watch.priceAtWatch.toFixed(3)}` : "-"} → Current:{" "}
        {currentPriceUsd && currentPriceUsd > 0 ? `$${currentPriceUsd.toFixed(3)}` : "-"}
      </Typography>
      {pct !== null && (
        <Typography variant="caption" display="block" sx={{ color: pctColor(pct) }}>
          {formatPct(pct)}
        </Typography>
      )}
      <Typography variant="caption" display="block">
        Watched since {new Date(watch.watchedAt).toLocaleString()}
      </Typography>
    </Box>
  ) : (
    "Watch"
  );

  return (
    <Tooltip title={title} arrow>
      <IconButton
        size="small"
        aria-label={watch ? "Unwatch item" : "Watch item"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        sx={{ color: watch ? "error.main" : "text.secondary" }}
      >
        {watch ? <MdFavorite size={15} /> : <MdFavoriteBorder size={15} />}
      </IconButton>
    </Tooltip>
  );
}
