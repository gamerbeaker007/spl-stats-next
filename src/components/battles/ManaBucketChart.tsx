"use client";

import type React from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import Box from "@mui/material/Box";

// Plotly has no SSR support — load client-side only
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
}) as React.ComponentType<PlotParams>;

interface ManaBucketChartProps {
  data: { bucket: string; count: number }[];
  width?: number;
  height?: number;
}

export default function ManaBucketChart({ data, width, height = 200 }: ManaBucketChartProps) {
  const x = data.map((d) => d.bucket);
  const y = data.map((d) => d.count);

  return (
    <Box sx={{ width: width ?? "100%", overflowX: width ? "visible" : "auto" }}>
      <Plot
        data={[
          {
            type: "bar",
            x,
            y,
            marker: {
              color: "rgba(33, 150, 243, 0.75)",
              line: { color: "rgba(33, 150, 243, 1)", width: 1 },
            },
          },
        ]}
        layout={{
          width: width,
          height,
          margin: { l: 36, r: 10, t: 10, b: 40 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          xaxis: {
            title: { text: "Mana cap", standoff: 6 },
            color: "currentColor",
            gridcolor: "rgba(128,128,128,0.2)",
            tickfont: { size: 9 },
          },
          yaxis: {
            title: { text: "Battles", standoff: 4 },
            color: "currentColor",
            gridcolor: "rgba(128,128,128,0.2)",
            tickfont: { size: 9 },
          },
          font: { color: "currentColor", size: 10 },
        }}
        config={{ displayModeBar: false, responsive: !width }}
        style={{ width: width ? `${width}px` : "100%" }}
      />
    </Box>
  );
}
