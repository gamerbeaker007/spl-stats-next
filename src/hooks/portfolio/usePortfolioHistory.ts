"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getCollectionHistoryAction,
  getInventoryHistoryAction,
  getPortfolioHistoryAction,
} from "@/lib/backend/actions/portfolio-actions";

function accountsKey(prefix: string, accounts: string[]): string | null {
  return accounts.length > 0 ? `${prefix}:${accounts.join(",")}` : null;
}

/** Portfolio value totals history + cumulative investments for the selected accounts. */
export function usePortfolioHistory(accounts: string[]) {
  return useAsyncData(
    accountsKey("portfolio-history", accounts),
    () => getPortfolioHistoryAction(accounts),
    { errorMessage: "Failed to load portfolio history" }
  );
}

/** Per-edition card collection history for the selected accounts. */
export function useCollectionHistory(accounts: string[]) {
  return useAsyncData(
    accountsKey("portfolio-collection-history", accounts),
    () => getCollectionHistoryAction(accounts),
    { errorMessage: "Failed to load collection history" }
  );
}

/** Per-item inventory history for the selected accounts. */
export function useInventoryHistory(accounts: string[]) {
  return useAsyncData(
    accountsKey("portfolio-inventory-history", accounts),
    () => getInventoryHistoryAction(accounts),
    { errorMessage: "Failed to load inventory history" }
  );
}
