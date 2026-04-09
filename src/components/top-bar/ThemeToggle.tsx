"use client";

import { useTheme, type AppTheme } from "@/lib/frontend/context/ThemeSetup";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { useSyncExternalStore } from "react";
import { MdContrast, MdDarkMode, MdLightMode } from "react-icons/md";

const CYCLE: AppTheme[] = ["light", "dark", "high-contrast"];
const NEXT_LABEL: Record<AppTheme, string> = {
  light: "Switch to Dark",
  dark: "Switch to High Contrast",
  "high-contrast": "Switch to Light",
};
const THEME_ICON: Record<AppTheme, React.ReactNode> = {
  light: <MdLightMode size={20} />,
  dark: <MdDarkMode size={20} />,
  "high-contrast": <MdContrast size={20} />,
};

// Returns false on server, true on client — avoids hydration mismatch.
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  // Render "light" icon on server to match SSR output.
  const current = mounted ? theme : "light";
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <Tooltip title={NEXT_LABEL[current]}>
      <IconButton
        onClick={() => setTheme(next)}
        aria-label={NEXT_LABEL[current]}
        color="inherit"
        size="small"
        suppressHydrationWarning
      >
        {THEME_ICON[current]}
      </IconButton>
    </Tooltip>
  );
}
