"use client";

import { useMediaQuery } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";
import { MdDarkMode, MdLightMode } from "react-icons/md";

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  const resolvedMode = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  if (!mode) return null;

  const isDark = resolvedMode === "dark";

  return (
    <IconButton
      aria-label="Toggle theme"
      onClick={() => setMode(isDark ? "light" : "dark")}
      sx={{
        width: 50,
        height: 28,
        bgcolor: isDark ? "grey.700" : "primary.main",
        borderRadius: "999px",
        padding: 0,
        position: "relative",
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          bgcolor: isDark ? "grey.600" : "primary.dark",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 20,
          height: 20,
          bgcolor: "white",
          borderRadius: "50%",
          left: isDark ? "calc(100% - 24px)" : "4px",
          transition: "left 0.3s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isDark ? (
          <MdDarkMode size={14} color="#1976d2" />
        ) : (
          <MdLightMode size={14} color="#ff9800" />
        )}
      </Box>
    </IconButton>
  );
}
