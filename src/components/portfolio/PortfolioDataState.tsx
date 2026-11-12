"use client";

import { PortfolioChartSkeleton } from "@/components/portfolio/PortfolioSkeleton";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface Props<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  children: (data: T) => ReactNode;
}

/**
 * Loading / error frame for a portfolio page's history data: skeleton on first load,
 * an inline spinner (keeping the previous charts) while the account selection reloads.
 */
export default function PortfolioDataState<T>({ data, loading, error, children }: Props<T>) {
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && data !== undefined && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Updating…
          </Typography>
        </Box>
      )}
      {data === undefined ? loading && <PortfolioChartSkeleton /> : children(data)}
    </>
  );
}
