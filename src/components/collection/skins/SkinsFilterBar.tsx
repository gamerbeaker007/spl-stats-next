"use client";

import MarketFilterBar from "@/components/collection/marketplace/MarketFilterBar";
import type { MarketAssetFilter } from "@/lib/shared/marketplace-assets";
import type { SkinViewMode } from "@/types/skins";
import {
  Box,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import { MdGridView, MdInfoOutline, MdViewAgenda } from "react-icons/md";

interface SkinsFilterBarProps {
  isAuthenticated: boolean;
  ownedOnly: boolean;
  onOwnedOnlyChange: (checked: boolean) => void;
  missingEquippedOnly: boolean;
  onMissingEquippedOnlyChange: (checked: boolean) => void;
  skinSets: string[];
  selectedSkinSet: string;
  onSelectedSkinSetChange: (skinSet: string) => void;
  marketFilter: MarketAssetFilter;
  onMarketFilterChange: (filter: MarketAssetFilter) => void;
  viewMode: SkinViewMode;
  onViewModeChange: (viewMode: SkinViewMode) => void;
  /** The table layout has no grouped variant, so the grouped/flat toggle is hidden. */
  showViewModeToggle: boolean;
}

interface SwitchWithHintProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}

function SwitchWithHint({ checked, onChange, label, hint }: Readonly<SwitchWithHintProps>) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <FormControlLabel
        sx={{ m: 0 }}
        control={
          <Switch
            size="small"
            checked={checked}
            onChange={(_event, nextChecked) => onChange(nextChecked)}
          />
        }
        label={label}
      />

      <Tooltip title={hint}>
        <Box
          component="span"
          sx={{ display: "inline-flex", color: "text.secondary", cursor: "help" }}
        >
          <MdInfoOutline size={17} />
        </Box>
      </Tooltip>
    </Stack>
  );
}

/** Collection/skin filters, marketplace filters and the grouped/flat view toggle. */
export function SkinsFilterBar({
  isAuthenticated,
  ownedOnly,
  onOwnedOnlyChange,
  missingEquippedOnly,
  onMissingEquippedOnlyChange,
  skinSets,
  selectedSkinSet,
  onSelectedSkinSetChange,
  marketFilter,
  onMarketFilterChange,
  viewMode,
  onViewModeChange,
  showViewModeToggle,
}: Readonly<SkinsFilterBarProps>) {
  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 2,
        backgroundColor: "background.paper",
        border: 1,
        borderColor: "divider",
      }}
    >
      {/* Collection / skin filters */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        flexWrap="wrap"
        useFlexGap
      >
        {isAuthenticated && (
          <SwitchWithHint
            checked={ownedOnly}
            onChange={onOwnedOnlyChange}
            label="Owned only"
            hint="Only show skins owned by the selected account."
          />
        )}

        {isAuthenticated && (
          <SwitchWithHint
            checked={missingEquippedOnly}
            onChange={onMissingEquippedOnlyChange}
            label="Base skin active"
            hint="Show owned cards that have a skin available, but are still using the base skin."
          />
        )}

        <Select
          size="small"
          value={selectedSkinSet}
          onChange={(event) => onSelectedSkinSetChange(event.target.value)}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All skin sets</MenuItem>

          {skinSets.map((skinSet) => (
            <MenuItem key={skinSet} value={skinSet}>
              {skinSet}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Box mt={1} mb={1} borderBottom={1} borderColor="divider" />

      {/* Marketplace filters + view controls */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <MarketFilterBar
          filter={marketFilter}
          onChange={onMarketFilterChange}
          showOutbidFilter={isAuthenticated}
        />

        {showViewModeToggle && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={viewMode}
            onChange={(_event, value: SkinViewMode | null) => {
              if (value) onViewModeChange(value);
            }}
            sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
          >
            <Tooltip title="Group skins by base card">
              <ToggleButton value="grouped" aria-label="Grouped by card">
                <MdViewAgenda size={18} />
              </ToggleButton>
            </Tooltip>

            <Tooltip title="Show all skins in a flat grid">
              <ToggleButton value="flat" aria-label="Flat skin grid">
                <MdGridView size={18} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        )}
      </Stack>
    </Box>
  );
}
