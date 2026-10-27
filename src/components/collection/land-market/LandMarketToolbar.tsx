"use client";

import MarketPricesStamp from "@/components/collection/marketplace/MarketPricesStamp";
import { Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { MdFilterListOff, MdRefresh } from "react-icons/md";

interface LandMarketToolbarProps {
  total: number;
  matching: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  refreshing: boolean;
  fetchedAt: string | null;
  onRefresh: () => void;
}

/** Result count, sort control (also used by the grid), clear-filters and refresh. */
export default function LandMarketToolbar({
  total,
  matching,
  activeFilterCount,
  onClearFilters,
  refreshing,
  fetchedAt,
  onRefresh,
}: Readonly<LandMarketToolbarProps>) {
  const updated = fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      flexWrap="wrap"
      useFlexGap
      sx={{ justifyContent: "space-between" }}
    >
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" fontWeight={600} aria-live="polite">
          {matching.toLocaleString()} {matching === 1 ? "listing" : "listings"}
          {matching !== total && (
            <Typography component="span" variant="body2" color="text.secondary">
              {" "}
              of {total.toLocaleString()}
            </Typography>
          )}
        </Typography>
        {activeFilterCount > 0 && (
          <Button
            size="small"
            color="inherit"
            startIcon={<MdFilterListOff size={16} />}
            onClick={onClearFilters}
            sx={{ textTransform: "none" }}
          >
            Clear {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"}
          </Button>
        )}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <MarketPricesStamp fetchedAt={fetchedAt} />
        <Tooltip title={updated ? `Updated ${updated} — refresh listings` : "Refresh listings"}>
          <span>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh listings"
            >
              {refreshing ? <CircularProgress size={18} /> : <MdRefresh size={20} />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
