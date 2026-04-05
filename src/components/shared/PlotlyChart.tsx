"use client";

/**
 * Thin SSR-safe wrapper around react-plotly.js.
 * Dynamically imported so plotly's browser-only code never runs on the server.
 *
 * Supports all three app themes (light / dark / high-contrast) by mapping them
 * to appropriate Plotly layout templates and colours.
 *
 * A custom "Fullscreen" button is injected into the Plotly mode bar that opens
 * the chart in a MUI Dialog.
 */

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import dynamic from "next/dynamic";
import type { Config, Data, Layout, ModeBarButton } from "plotly.js";
import { useState } from "react";
import { MdClose } from "react-icons/md";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ---------------------------------------------------------------------------
// Theme mapping
// ---------------------------------------------------------------------------

export type AppTheme = "light" | "dark" | "high-contrast";

interface ThemeTokens {
  plotlyTemplate: string;
  paper_bgcolor: string;
  plot_bgcolor: string;
  font_color: string;
  gridcolor: string;
  zerolinecolor: string;
}

const THEME_TOKENS: Record<AppTheme, ThemeTokens> = {
  light: {
    plotlyTemplate: "plotly_white",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font_color: "#1a1a1a",
    gridcolor: "rgba(0,0,0,0.08)",
    zerolinecolor: "rgba(0,0,0,0.15)",
  },
  dark: {
    plotlyTemplate: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font_color: "#e0e0e0",
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.15)",
  },
  "high-contrast": {
    plotlyTemplate: "plotly_dark",
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font_color: "#ffffff",
    gridcolor: "rgba(255,255,255,0.10)",
    zerolinecolor: "rgba(255,255,255,0.22)",
  },
};

export function getPlotlyThemeLayout(theme: AppTheme): Partial<Layout> {
  const t = THEME_TOKENS[theme];
  return {
    template: t.plotlyTemplate as Layout["template"],
    paper_bgcolor: t.paper_bgcolor,
    plot_bgcolor: t.plot_bgcolor,
    font: { color: t.font_color, family: "inherit" },
    xaxis: { gridcolor: t.gridcolor, zerolinecolor: t.zerolinecolor, gridwidth: 0.5 },
    yaxis: { gridcolor: t.gridcolor, zerolinecolor: t.zerolinecolor, gridwidth: 0.5 },
    margin: { l: 50, r: 30, t: 40, b: 50 },
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.02,
      xanchor: "right",
      x: 1,
      font: { color: t.font_color },
    },
  };
}

// ---------------------------------------------------------------------------
// Fullscreen SVG icon path (matches FullscreenPlotWrapper pattern)
// ---------------------------------------------------------------------------

const FULLSCREEN_ICON = {
  width: 1024,
  height: 1024,
  path: "M128 128v256h64V192h192v-64H128zm576 0v64h192v192h64V128H704zM128 704v192h256v-64H192V704h-64zm704 0v128H640v64h256V704h-64z",
  transform: "matrix(1 0 0 -1 0 1024)",
  ascent: 1024,
  descent: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  theme: AppTheme;
  height?: number;
}

export default function PlotlyChart({
  data,
  layout = {},
  config = {},
  theme,
  height = 380,
}: PlotlyChartProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const themeLayout = getPlotlyThemeLayout(theme);

  const mergedLayout: Partial<Layout> = {
    ...themeLayout,
    ...layout,
    font: { ...themeLayout.font, ...(layout.font ?? {}) },
    xaxis: { ...themeLayout.xaxis, ...(layout.xaxis ?? {}) },
    yaxis: { ...themeLayout.yaxis, ...(layout.yaxis ?? {}) },
    height,
  };

  const fullscreenLayout: Partial<Layout> = {
    ...themeLayout,
    ...layout,
    font: { ...themeLayout.font, ...(layout.font ?? {}) },
    xaxis: { ...themeLayout.xaxis, ...(layout.xaxis ?? {}) },
    yaxis: { ...themeLayout.yaxis, ...(layout.yaxis ?? {}) },
    autosize: true,
    height: undefined,
  };

  const fullscreenButton: ModeBarButton = {
    name: "fullscreenDialog",
    title: "Open fullscreen",
    icon: FULLSCREEN_ICON,
    click: () => setFullscreen(true),
    attr: "",
    val: "",
    toggle: false,
  };

  const mergedConfig: Partial<Config> = {
    // displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtonsToAdd: [fullscreenButton],
    ...config,
  };

  return (
    <>
      <Box sx={{ width: "100%", minHeight: height }}>
        <Plot
          data={data}
          layout={mergedLayout}
          config={mergedConfig}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </Box>

      <Dialog fullScreen open={fullscreen} onClose={() => setFullscreen(false)}>
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1200 }}>
          <IconButton
            onClick={() => setFullscreen(false)}
            size="small"
            aria-label="Close fullscreen"
          >
            <MdClose size={22} />
          </IconButton>
        </Box>
        <Box sx={{ width: "100%", height: "100%", p: 1 }}>
          <Plot
            data={data}
            layout={fullscreenLayout}
            config={{ ...mergedConfig, modeBarButtonsToAdd: [] }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </Box>
      </Dialog>
    </>
  );
}
