"use client";

import { Avatar, Chip, Stack, Typography } from "@mui/material";

export interface ChartFilterOption {
  key: string;
  label: string;
  iconUrl?: string;
}

interface Props {
  label: string;
  options: ChartFilterOption[];
  /** Selected keys. Empty = no filter (show everything). */
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Multi-select toggle chips for filtering chart series (same look as the Packs set
 * filter). An empty selection shows all series; "All" clears the selection.
 */
export default function ChartFilterChips({ label, options, selected, onChange }: Readonly<Props>) {
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
        <Chip
          label="All"
          onClick={() => onChange(new Set())}
          color={selected.size === 0 ? "primary" : "default"}
          variant={selected.size === 0 ? "filled" : "outlined"}
        />
        {options.map((option) => {
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
    </div>
  );
}
