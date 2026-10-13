"use client";

import FilterPanelShell from "@/components/shared/filter/FilterPanelShell";
import FilterSection from "@/components/shared/filter/FilterSection";
import IconFilterGroup, { type IconFilterOption } from "@/components/shared/filter/IconFilterGroup";
import TriStateToggle from "@/components/shared/filter/TriStateToggle";
import {
  LAND_RESOURCE_DEFS,
  LAND_TYPE_LABELS,
  LAND_WORKSITES,
  capitalize,
  getLandRarityColor,
  getLandRarityIconUrl,
  getLandTerrainIconUrl,
  getLandTypeIconUrl,
} from "@/lib/shared/land-deed-utils";
import { LAND_LOCATION_MAX, parseLocationInput } from "@/lib/shared/land-market";
import {
  LAND_RARITIES,
  LAND_RESOURCES,
  LAND_TERRAINS,
  LAND_TYPES,
  type LandMarketFilter,
  type LandResource,
  type LandTerrain,
} from "@/types/land/landMarket";
import { Box, Chip, Divider, Stack, TextField } from "@mui/material";

const TERRAIN_OPTIONS: IconFilterOption<LandTerrain>[] = LAND_TERRAINS.map((terrain) => ({
  value: terrain,
  label: capitalize(terrain),
  iconUrl: getLandTerrainIconUrl(terrain),
}));

const RESOURCE_OPTIONS: IconFilterOption<LandResource>[] = LAND_RESOURCES.map((resource) => ({
  value: resource,
  label: LAND_RESOURCE_DEFS[resource].label,
  iconUrl: LAND_RESOURCE_DEFS[resource].iconUrl,
}));

const LOCATION_FIELDS = [
  { key: "region", label: "Region" },
  { key: "tract", label: "Tract" },
  { key: "plot", label: "Plot" },
] as const;

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function ChipIcon({ src, alt }: Readonly<{ src: string; alt: string }>) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{ width: 18, height: 18, objectFit: "contain", ml: "4px !important" }}
    />
  );
}

interface LandMarketFilterPanelProps {
  filter: LandMarketFilter;
  setFilter: (updates: Partial<LandMarketFilter>) => void;
  resetFilter: () => void;
  open: boolean;
  onToggle: () => void;
  activeCount: number;
}

export default function LandMarketFilterPanel({
  filter,
  setFilter,
  resetFilter,
  open,
  onToggle,
  activeCount,
}: Readonly<LandMarketFilterPanelProps>) {
  return (
    <FilterPanelShell
      open={open}
      onToggle={onToggle}
      onReset={resetFilter}
      activeCount={activeCount}
      ariaLabel="Land market filter"
    >
      <FilterSection title="Location">
        <Stack direction="row" spacing={1}>
          {LOCATION_FIELDS.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              size="small"
              value={filter[key] === null ? "" : String(filter[key])}
              onChange={(event) => {
                const parsed = parseLocationInput(event.target.value.trim());
                // Reject non-digits, 0, and values above the max — keep the last valid value.
                if (parsed !== undefined) setFilter({ [key]: parsed });
              }}
              placeholder="Any"
              slotProps={{
                // Keep the label small and floating so it fits the narrow panel.
                inputLabel: { shrink: true },
                htmlInput: {
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: String(LAND_LOCATION_MAX).length,
                  "aria-label": `${label} number (1-${LAND_LOCATION_MAX})`,
                },
              }}
            />
          ))}
        </Stack>
      </FilterSection>

      <FilterSection title="Rarity">
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {LAND_RARITIES.map((rarity) => {
            const selected = filter.rarities.includes(rarity);
            const color = getLandRarityColor(rarity);
            return (
              <Chip
                key={rarity}
                size="small"
                label={capitalize(rarity)}
                icon={<ChipIcon src={getLandRarityIconUrl(rarity)} alt="" />}
                aria-pressed={selected}
                onClick={() => setFilter({ rarities: toggleValue(filter.rarities, rarity) })}
                variant={selected ? "filled" : "outlined"}
                sx={{
                  borderColor: color,
                  ...(selected && { bgcolor: color, color: "#fff", "&:hover": { bgcolor: color } }),
                }}
              />
            );
          })}
        </Stack>
      </FilterSection>

      <FilterSection title="Land Type">
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {LAND_TYPES.map((landType) => {
            const selected = filter.landType === landType;
            return (
              <Chip
                key={landType}
                size="small"
                label={LAND_TYPE_LABELS[landType]}
                icon={<ChipIcon src={getLandTypeIconUrl(landType)} alt="" />}
                aria-pressed={selected}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                // Single select: clicking the active type clears it.
                onClick={() => setFilter({ landType: selected ? null : landType })}
              />
            );
          })}
        </Stack>
      </FilterSection>

      <FilterSection title="Terrain">
        <IconFilterGroup
          options={TERRAIN_OPTIONS}
          selected={filter.terrains}
          onChange={(terrains) => setFilter({ terrains })}
        />
      </FilterSection>

      <FilterSection title="Resource">
        <IconFilterGroup
          options={RESOURCE_OPTIONS}
          selected={filter.resources}
          onChange={(resources) => setFilter({ resources })}
        />
      </FilterSection>

      <FilterSection title="Worksite">
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {LAND_WORKSITES.map((worksite) => {
            const selected = filter.worksites.includes(worksite.type);
            return (
              <Chip
                key={worksite.type}
                size="small"
                label={worksite.label}
                icon={<ChipIcon src={worksite.iconUrl} alt="" />}
                aria-pressed={selected}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() =>
                  setFilter({ worksites: toggleValue(filter.worksites, worksite.type) })
                }
              />
            );
          })}
        </Stack>
      </FilterSection>

      <Divider sx={{ my: 1.5 }} />

      <Stack spacing={1}>
        <TriStateToggle
          label="Surveyed"
          value={filter.surveyed}
          onChange={(surveyed) => setFilter({ surveyed })}
        />
        <TriStateToggle
          label="Developed"
          value={filter.developed}
          onChange={(developed) => setFilter({ developed })}
        />
        <TriStateToggle
          label="Building in Box"
          value={filter.buildingInBox}
          onChange={(buildingInBox) => setFilter({ buildingInBox })}
        />
        <TriStateToggle
          label="Unstable Totem"
          value={filter.unstableTotem}
          onChange={(unstableTotem) => setFilter({ unstableTotem })}
        />
      </Stack>
    </FilterPanelShell>
  );
}
