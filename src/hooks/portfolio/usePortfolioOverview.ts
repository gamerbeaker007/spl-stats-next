"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getPortfolioOverviewAction } from "@/lib/backend/actions/portfolio-actions";

/** Latest combined snapshot ("current values" tiles) + total invested for the selected accounts. */
export function usePortfolioOverview(accounts: string[]) {
  return useAsyncData(
    accounts.length > 0 ? `portfolio-overview:${accounts.join(",")}` : null,
    () => getPortfolioOverviewAction(accounts),
    { errorMessage: "Failed to load portfolio overview" }
  );
}
