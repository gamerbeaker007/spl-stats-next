"use client";

import type { LandMarketSort, LandMarketSortField } from "@/types/land/landMarket";
import {
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
} from "@mui/material";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";

const SORT_OPTIONS: Array<{ field: LandMarketSortField; label: string }> = [
  { field: "price", label: "Price" },
  { field: "location", label: "Location" },
  { field: "since", label: "Listed" },
  { field: "rarity", label: "Rarity" },
];

interface LandMarketControlsProps {
  showWatchedOnly: boolean;
  watchedOnly: boolean;
  onWatchedOnlyChange: (checked: boolean) => void;
  sort: LandMarketSort;
  onSortChange: (field: LandMarketSortField) => void;
  viewMode: "table" | "card";
}

export default function LandMarketControls({
  showWatchedOnly,
  watchedOnly,
  onWatchedOnlyChange,
  sort,
  onSortChange,
  viewMode,
}: Readonly<LandMarketControlsProps>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
      {showWatchedOnly && (
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              size="small"
              checked={watchedOnly}
              onChange={(_event, checked) => onWatchedOnlyChange(checked)}
            />
          }
          label="Watched only"
        />
      )}
      {viewMode === "card" && (
        <>
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
        </>
      )}
    </Stack>
  );
}
