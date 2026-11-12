"use client";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export type ChartMetric = "both" | "value" | "qty";

interface Props {
  value: ChartMetric;
  onChange: (next: ChartMetric) => void;
  /** Label of the quantity series, e.g. "BCX" or "Quantity". */
  qtyLabel: string;
}

/** Toggles which axis series a portfolio chart draws: value (USD), quantity, or both. */
export default function ChartMetricToggle({ value, onChange, qtyLabel }: Readonly<Props>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_e, next: ChartMetric | null) => {
        if (next) onChange(next);
      }}
    >
      <ToggleButton value="both" sx={{ textTransform: "none" }}>
        Value + {qtyLabel}
      </ToggleButton>
      <ToggleButton value="value" sx={{ textTransform: "none" }}>
        Value
      </ToggleButton>
      <ToggleButton value="qty" sx={{ textTransform: "none" }}>
        {qtyLabel}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
