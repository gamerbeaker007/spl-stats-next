"use client";

import type { PurchasePlanItem } from "@/types/purchase/purchase-plan";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

interface PurchasePlanContextType {
  items: PurchasePlanItem[];
  isCheckoutOpen: boolean;
  balanceRefreshVersion: number;
  collectionRefreshVersion: number;
  setCheckoutOpen: (open: boolean) => void;
  addItems: (items: PurchasePlanItem[]) => void;
  removeItem: (account: string, marketId: string) => void;
  removeMany: (items: Array<{ account: string; marketId: string }>) => void;
  clear: () => void;
  notifyBalancesRefresh: () => void;
  notifyCollectionRefresh: () => void;
  count: number;
}

const PurchasePlanContext = createContext<PurchasePlanContextType | undefined>(undefined);

function keyOf(item: { account: string; marketId: string }): string {
  return `${item.account.toLowerCase()}::${item.marketId}`;
}

export function PurchasePlanProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [items, setItems] = useState<PurchasePlanItem[]>([]);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [balanceRefreshVersion, setBalanceRefreshVersion] = useState(0);
  const [collectionRefreshVersion, setCollectionRefreshVersion] = useState(0);

  const value = useMemo<PurchasePlanContextType>(
    () => ({
      items,
      isCheckoutOpen,
      balanceRefreshVersion,
      collectionRefreshVersion,
      setCheckoutOpen,
      addItems: (incoming) => {
        setItems((prev) => {
          const byMarketId = new Map(prev.map((item) => [item.marketId, item]));
          for (const item of incoming) {
            const existing = byMarketId.get(item.marketId);
            if (!existing) {
              byMarketId.set(item.marketId, item);
              continue;
            }

            // A listing can only be reserved by one buyer account at a time.
            // Keep the existing reservation if it belongs to another account.
            if (existing.account.toLowerCase() === item.account.toLowerCase()) {
              byMarketId.set(item.marketId, item);
            }
          }
          return Array.from(byMarketId.values());
        });
      },
      removeItem: (account, marketId) => {
        const key = keyOf({ account, marketId });
        setItems((prev) => prev.filter((entry) => keyOf(entry) !== key));
      },
      removeMany: (toRemove) => {
        const removeKeys = new Set(toRemove.map((entry) => keyOf(entry)));
        setItems((prev) => prev.filter((entry) => !removeKeys.has(keyOf(entry))));
      },
      clear: () => setItems([]),
      notifyBalancesRefresh: () => setBalanceRefreshVersion((v) => v + 1),
      notifyCollectionRefresh: () => {
        setCollectionRefreshVersion((v) => v + 1);
        // SPL's collection/ownership read API can lag a few seconds behind a
        // confirmed purchase, so an immediate refetch often still returns the
        // old ownership. Re-trigger on a short schedule so every consumer
        // (dialog, tables, card grid) converges on the updated data without the
        // user having to close and reopen the dialog.
        setTimeout(() => setCollectionRefreshVersion((v) => v + 1), 3000);
        setTimeout(() => setCollectionRefreshVersion((v) => v + 1), 8000);
      },
      count: items.length,
    }),
    [balanceRefreshVersion, collectionRefreshVersion, isCheckoutOpen, items]
  );

  return <PurchasePlanContext.Provider value={value}>{children}</PurchasePlanContext.Provider>;
}

export function usePurchasePlan() {
  const context = useContext(PurchasePlanContext);
  if (!context) {
    throw new Error("usePurchasePlan must be used within PurchasePlanProvider");
  }
  return context;
}
