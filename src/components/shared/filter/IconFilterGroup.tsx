"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";

export interface IconFilterOption<T extends string | number> {
  value: T;
  label: string;
  iconUrl: string;
}

interface IconFilterGroupProps<T extends string | number> {
  options: readonly IconFilterOption<T>[];
  selected: T[];
  onChange: (v: T[]) => void;
}

export default function IconFilterGroup<T extends string | number>({
  options,
  selected,
  onChange,
}: IconFilterGroupProps<T>) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
      {options.map(({ value, label, iconUrl }) => {
        const active = selected.includes(value);
        return (
          <Tooltip key={String(value)} title={label} placement="top" arrow>
            <Box
              onClick={() => toggle(value)}
              sx={{
                width: 36,
                height: 36,
                p: 0.5,
                cursor: "pointer",
                borderRadius: 1,
                border: 2,
                borderColor: active ? "primary.main" : "divider",
                bgcolor: active ? "action.selected" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: active ? 1 : 0.5,
                transition: "all 0.15s",
                "&:hover": { bgcolor: "action.hover", opacity: 1 },
              }}
            >
              <Image
                src={iconUrl}
                alt={label}
                width={24}
                height={24}
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
