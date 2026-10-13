"use client";

import type { LandMarketSort, LandMarketSortField } from "@/types/land/landMarket";
import {
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { MdArrowDownward, MdArrowUpward, MdFilterListOff, MdRefresh } from "react-icons/md";

const SORT_OPTIONS: Array<{ field: LandMarketSortField; label: string }> = [
  { field: "price", label: "Price" },
  { field: "location", label: "Location" },
  { field: "since", label: "Listed" },
  { field: "rarity", label: "Rarity" },
];

interface LandMarketToolbarProps {
  total: number;
  matching: number;
  activeFilterCount: number;
  onClearFilters: () => void;
  sort: LandMarketSort;
  onSortChange: (field: LandMarketSortField) => void;
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
  sort,
  onSortChange,
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

      <Stack direction="row" alignItems="center" spacing={1}>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="land-market-sort-label">Sort by</InputLabel>
          <Select
            labelId="land-market-sort-label"
            label="Sort by"
            value={sort.field}
            onChange={(event) => onSortChange(event.target.value as LandMarketSortField)}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.field} value={option.field}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title={sort.direction === "asc" ? "Ascending" : "Descending"}>
          <IconButton
            size="small"
            onClick={() => onSortChange(sort.field)}
            aria-label={`Sort direction: ${sort.direction === "asc" ? "ascending" : "descending"}. Toggle.`}
          >
            {sort.direction === "asc" ? <MdArrowUpward /> : <MdArrowDownward />}
          </IconButton>
        </Tooltip>
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
