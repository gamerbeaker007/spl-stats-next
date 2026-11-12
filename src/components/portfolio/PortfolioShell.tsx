"use client";

import PortfolioSubNav from "@/components/portfolio/PortfolioSubNav";
import PortfolioSummaryCards from "@/components/portfolio/PortfolioSummaryCards";
import { PortfolioTilesSkeleton } from "@/components/portfolio/PortfolioSkeleton";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { PortfolioProvider, usePortfolio } from "@/lib/frontend/context/PortfolioContext";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

function PortfolioHeader() {
  const { allAccounts, selectedAccounts, setSelectedAccounts, overview } = usePortfolio();
  const { data, loading, error } = overview;

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <AccountSelectorBar
          multiSelect
          accounts={allAccounts}
          selectedAccounts={selectedAccounts}
          onSelectedAccountsChange={setSelectedAccounts}
          extraContent={loading && data ? <CircularProgress size={18} /> : null}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!data && loading && <PortfolioTilesSkeleton />}
      {data &&
        (data.snapshot ? (
          <PortfolioSummaryCards snapshot={data.snapshot} totalInvested={data.totalInvested} />
        ) : (
          <Alert severity="info">
            No portfolio snapshot data found. The worker needs to run first, or import data from the
            Admin page.
          </Alert>
        ))}
    </Stack>
  );
}

/**
 * Shared frame for every /portfolio page: title, sub-navigation, multi-account selector
 * and the "current values" tiles. Selection + tile data live in `PortfolioProvider` so
 * switching pages keeps them without refetching.
 */
export default function PortfolioShell({
  allAccounts,
  children,
}: Readonly<{ allAccounts: string[]; children: ReactNode }>) {
  return (
    <PortfolioProvider allAccounts={allAccounts}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Portfolio
        </Typography>
        <PortfolioSubNav />
        <PortfolioHeader />
        {children}
      </Box>
    </PortfolioProvider>
  );
}
