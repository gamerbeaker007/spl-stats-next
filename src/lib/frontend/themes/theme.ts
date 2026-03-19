"use client";

import { extendTheme } from "@mui/material/styles";

const theme = extendTheme({
  colorSchemeSelector: "class",
  defaultColorScheme: "light",
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#65c3c8" },
        secondary: { main: "#ef9fbc" },
        background: {
          default: "#faf7f5",
          paper: "#fff",
        },
        error: { main: "#f87272" },
        warning: { main: "#fbbd23" },
        info: { main: "#3abff8" },
        success: { main: "#36d399" },
        text: {
          primary: "#291334",
          secondary: "#5e3b73",
        },
      },
    },
    dark: {
      palette: {
        primary: { main: "#38bdf8" },
        secondary: { main: "#8b5cf6" },
        background: {
          default: "#0f172a",
          paper: "#1e293b",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#cbd5e1",
        },
      },
    },
  },
  typography: {
    fontFamily: `"Comic Neue", "Arial", sans-serif`,
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
