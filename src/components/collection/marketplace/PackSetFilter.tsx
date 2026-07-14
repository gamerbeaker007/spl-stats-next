"use client";

import { PACK_SET_OPTIONS } from "@/lib/shared/marketplace-pack-sets";
import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";

interface PackSetFilterProps {
  /** Currently-selected set keys. Empty = no filter (show all packs). */
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Set-based filter for the Packs page: one toggle chip per set, showing the set
 * icon with the set name beside it. Multi-select; an empty selection shows all
 * packs. Selecting a set queries all its marketplace pack editions.
 */
export default function PackSetFilter({ selected, onChange }: Readonly<PackSetFilterProps>) {
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
        Filter by set
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
        {PACK_SET_OPTIONS.map((option) => {
          const isSelected = selected.has(option.key);
          return (
            <Chip
              key={option.key}
              label={option.label}
              onClick={() => toggle(option.key)}
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              avatar={
                option.iconUrl ? (
                  <Avatar
                    src={option.iconUrl}
                    alt={option.label}
                    imgProps={{ style: { objectFit: "contain" } }}
                    sx={{ backgroundColor: "transparent" }}
                  />
                ) : undefined
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}
