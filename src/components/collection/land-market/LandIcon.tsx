"use client";

import { Box, Tooltip, Typography } from "@mui/material";
import { useState } from "react";

interface LandIconProps {
  src: string;
  /** Tooltip text and accessible name. */
  label: string;
  size?: number;
}

/**
 * Small land icon (terrain, rarity, resource, worksite, …) with a tooltip.
 * Focusable so the tooltip also works from the keyboard; falls back to a text
 * label if the remote icon fails to load.
 */
export default function LandIcon({ src, label, size = 22 }: Readonly<LandIconProps>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <Tooltip title={label} arrow>
      {failedSrc === src ? (
        <Typography
          variant="caption"
          tabIndex={0}
          sx={{ px: 0.5, border: 1, borderColor: "divider", borderRadius: 0.5, lineHeight: 1.6 }}
        >
          {label}
        </Typography>
      ) : (
        <Box
          component="img"
          src={src}
          alt={label}
          aria-label={label}
          tabIndex={0}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          sx={{
            width: size,
            height: size,
            objectFit: "contain",
            display: "block",
            flexShrink: 0,
            borderRadius: 0.5,
            "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineStyle: "solid" },
          }}
        />
      )}
    </Tooltip>
  );
}
