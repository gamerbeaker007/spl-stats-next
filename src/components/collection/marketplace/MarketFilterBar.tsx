"use client";

import type { MarketAssetFilter } from "@/lib/shared/marketplace-assets";
import {
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { MdArrowDownward, MdArrowUpward } from "react-icons/md";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";

interface MarketFilterBarProps {
  filter: MarketAssetFilter;
  onChange: (next: MarketAssetFilter) => void;
  showOutbidFilter?: boolean;
}

function parsePrice(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Shared marketplace filter controls: USD min/max price, listed-only, and
 * name/price sorting. Price uses number inputs (not a slider) because listing
 * prices are unbounded and vary widely per asset — exact entry beats a range.
 */
export default function MarketFilterBar({
  filter,
  onChange,
  showOutbidFilter = false,
}: Readonly<MarketFilterBarProps>) {
  const { viewMode } = useMarketplaceView();

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <TextField
        size="small"
        label="Min $"
        type="number"
        value={filter.minPrice ?? ""}
        onChange={(event) => onChange({ ...filter, minPrice: parsePrice(event.target.value) })}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />
      <TextField
        size="small"
        label="Max $"
        type="number"
        value={filter.maxPrice ?? ""}
        onChange={(event) => onChange({ ...filter, maxPrice: parsePrice(event.target.value) })}
        inputProps={{ min: 0, step: 0.01 }}
        sx={{ width: 100 }}
      />

      <FormControlLabel
        sx={{ ml: 0 }}
        control={
          <Switch
            size="small"
            checked={filter.listedOnly}
            onChange={(_event, checked) => onChange({ ...filter, listedOnly: checked })}
          />
        }
        label="Listed only"
      />

      {showOutbidFilter && (
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              size="small"
              checked={filter.outbidOnly}
              onChange={(_event, checked) => onChange({ ...filter, outbidOnly: checked })}
            />
          }
          label="Outbid"
        />
      )}

      {viewMode != "table" && (
        <>
          <TextField
            size="small"
            select
            label="Sort by"
            value={filter.sortBy}
            onChange={(event) =>
              onChange({ ...filter, sortBy: event.target.value as MarketAssetFilter["sortBy"] })
            }
            sx={{ width: 120 }}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="price">Price</MenuItem>
          </TextField>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter.sortDir}
            onChange={(_event, value: MarketAssetFilter["sortDir"] | null) => {
              if (value) onChange({ ...filter, sortDir: value });
            }}
          >
            <ToggleButton value="asc" aria-label="Ascending">
              <MdArrowUpward size={16} />
            </ToggleButton>
            <ToggleButton value="desc" aria-label="Descending">
              <MdArrowDownward size={16} />
            </ToggleButton>
          </ToggleButtonGroup>
        </>
      )}
    </Stack>
  );
}
