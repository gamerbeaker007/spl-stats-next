"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { TbCardsFilled } from "react-icons/tb";

export interface FoilOption {
  value: string;
  /** Short display label */
  label: string;
  /** Icon + border color */
  color: string;
  /** Text color on top of the icon */
  textColor: string;
}

interface Props {
  options: FoilOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function FoilFilterChips({ options, selected, onChange }: Props) {
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <Box
            key={opt.value}
            onClick={() => toggle(opt.value)}
            sx={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              cursor: "pointer",
              opacity: active ? 1 : 0.35,
              transition: "opacity 0.15s, filter 0.15s",
              filter: active ? "none" : "grayscale(60%)",
              "&:hover": { opacity: active ? 1 : 0.6 },
              userSelect: "none",
            }}
          >
            {/* Card icon as full background */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: opt.color,
              }}
            >
              <TbCardsFilled size={40} />
            </Box>

            {/* Bold label on top */}
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                color: opt.textColor,
                fontSize: "0.8rem",
                fontWeight: 800,
                lineHeight: 1,
                textAlign: "center",
                textShadow: "0 0 2px rgba(0,0,0,0.4)",
                letterSpacing: "0.02em",
                pr: "4px",
                // pb: "4px",
              }}
            >
              {opt.label}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
