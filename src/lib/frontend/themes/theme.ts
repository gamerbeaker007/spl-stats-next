"use client";

import { extendTheme } from "@mui/material/styles";

const theme = extendTheme({
  colorSchemeSelector: "class",
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#65c3c8" },
        secondary: { main: "#ef9fbc" },
        background: {
          default: "#faf7f5", // base-100
          paper: "#fff", // paper-like background
        },
        error: { main: "#f87272" },
        warning: { main: "#fbbd23" },
        info: { main: "#3abff8" },
        success: { main: "#36d399" },
        text: {
          primary: "#291334",
          secondary: "#5e3b73", // soft purple tone
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#38bdf8", // cool cyan (night vibe)
        },
        secondary: {
          main: "#8b5cf6", // modern violet
        },
        background: {
          default: "#0f172a", // dark navy
          paper: "#1e293b", // soft dark card
        },
        text: {
          primary: "#f1f5f9", // near-white text
          secondary: "#cbd5e1",
        },
      },
    },
  },
  typography: {
    fontFamily: `"Comic Neue", "Arial", sans-serif`, // Optional retro touch
  },
  shape: {
    borderRadius: 8, // Match DaisyUI soft edges
  },
});

export default theme;
