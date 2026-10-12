"use client";

import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useId } from "react";

/** `null` = Any, `true` = Yes, `false` = No. */
export type TriStateValue = boolean | null;

const OPTIONS: Array<{ key: "any" | "yes" | "no"; label: string; value: TriStateValue }> = [
  { key: "any", label: "Any", value: null },
  { key: "yes", label: "Yes", value: true },
  { key: "no", label: "No", value: false },
];

function keyOf(value: TriStateValue): "any" | "yes" | "no" {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "any";
}

interface TriStateToggleProps {
  label: string;
  value: TriStateValue;
  onChange: (value: TriStateValue) => void;
}

/**
 * Compact labelled `Any | Yes | No` switch for boolean filters. A native toggle
 * button group, so it is keyboard accessible and exposes the pressed option.
 */
export default function TriStateToggle({ label, value, onChange }: Readonly<TriStateToggleProps>) {
  const labelId = useId();

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography id={labelId} variant="body2">
        {label}
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        aria-labelledby={labelId}
        value={keyOf(value)}
        onChange={(_event, next: "any" | "yes" | "no" | null) => {
          // Clicking the active option deselects it in MUI — keep a value selected.
          if (next === null) return;
          onChange(OPTIONS.find((option) => option.key === next)?.value ?? null);
        }}
      >
        {OPTIONS.map((option) => (
          <ToggleButton
            key={option.key}
            value={option.key}
            aria-label={`${label}: ${option.label}`}
            sx={{ px: 1, py: 0.25, textTransform: "none", fontSize: "0.75rem", minWidth: 40 }}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
