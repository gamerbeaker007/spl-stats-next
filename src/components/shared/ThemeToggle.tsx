"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import { MdDarkMode, MdLightMode } from "react-icons/md";

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  if (!mode) return null;

  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? "Switch to Light" : "Switch to Dark"}>
      <IconButton
        aria-label={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
        onClick={() => setMode(isDark ? "light" : "dark")}
        sx={{
          width: 50,
          height: 28,
          bgcolor: isDark ? "#334155" : "#65c3c8",
          borderRadius: "999px",
          padding: 0,
          position: "relative",
          transition: "background-color 0.3s ease-in-out",
          "&:hover": { opacity: 0.85 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 20,
            height: 20,
            bgcolor: "white",
            borderRadius: "50%",
            left: isDark ? "calc(100% - 23px)" : "3px",
            transition: "left 0.3s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isDark ? (
            <MdDarkMode size={14} color="#38bdf8" />
          ) : (
            <MdLightMode size={14} color="#ff9800" />
          )}
        </Box>
      </IconButton>
    </Tooltip>
  );
}
