"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getPortfolioInvestmentsAction } from "@/lib/backend/actions/portfolio-actions";

/** Investment entries for the selected accounts; `enabled = false` skips loading (closed dialog). */
export function usePortfolioInvestments(accounts: string[], enabled: boolean) {
  return useAsyncData(
    enabled && accounts.length > 0 ? `portfolio-investments:${accounts.join(",")}` : null,
    () => getPortfolioInvestmentsAction(accounts),
    { errorMessage: "Failed to load investment entries", keepPreviousData: false }
  );
}
