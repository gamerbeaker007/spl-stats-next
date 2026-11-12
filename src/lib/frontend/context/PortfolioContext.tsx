"use client";

import { usePortfolioOverview } from "@/hooks/portfolio/usePortfolioOverview";
import type { UseAsyncDataReturn } from "@/hooks/useAsyncData";
import type { PortfolioOverviewResult } from "@/lib/backend/actions/portfolio-actions";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface PortfolioContextValue {
  /** All monitored accounts of the user. */
  allAccounts: string[];
  /** Selected accounts, always in `allAccounts` order (stable data keys). */
  selectedAccounts: string[];
  setSelectedAccounts: (accounts: string[]) => void;
  /** Current values (latest snapshot) — shared by every portfolio page's tiles. */
  overview: UseAsyncDataReturn<PortfolioOverviewResult>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

/**
 * Account selection for the /portfolio section. Lives in the section layout so it
 * survives navigation between the portfolio / collection / inventory pages; it is
 * not persisted — every visit starts with all monitored accounts selected.
 */
export function PortfolioProvider({
  allAccounts,
  children,
}: Readonly<{ allAccounts: string[]; children: ReactNode }>) {
  const [selection, setSelection] = useState<string[]>(allAccounts);

  const selectedAccounts = useMemo(
    () => allAccounts.filter((account) => selection.includes(account)),
    [allAccounts, selection]
  );

  const overview = usePortfolioOverview(selectedAccounts);

  const value = useMemo<PortfolioContextValue>(
    () => ({
      allAccounts,
      selectedAccounts,
      setSelectedAccounts: (accounts) => {
        // At least one account must stay selected.
        if (accounts.length > 0) setSelection(accounts);
      },
      overview,
    }),
    [allAccounts, selectedAccounts, overview]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside <PortfolioProvider>");
  return ctx;
}
