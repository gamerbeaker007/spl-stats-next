"use client";

import { currentMode } from "@/lib/shared/config/splApiConfig";
import Chip from "@mui/material/Chip";

/**
 * Fixed bottom-left badge shown whenever the app is pointed at the mavs-sl test
 * stack (NEXT_PUBLIC_SPL_DEV_API=true). Renders nothing in production.
 */
export default function TestModeChip() {
  if (currentMode() !== "test") return null;
  return (
    <Chip
      label="Test Mode Mavs-SL Active"
      color="warning"
      size="small"
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 1400,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    />
  );
}
