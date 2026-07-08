"use client";

import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { checkoutItems, type CheckoutResult } from "@/lib/frontend/purchase/checkout";
import type { PurchaseCurrency, PurchasePlanItem } from "@/types/purchase/purchase-plan";
import { useCallback, useMemo, useRef, useState } from "react";

interface CheckoutProgress {
  account: string;
  stage: "idle" | "broadcasting" | "verifying" | "success" | "error";
  message?: string;
}

export function usePurchaseCheckout(items: PurchasePlanItem[]) {
  const [progress, setProgress] = useState<CheckoutProgress[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(0);

  const accounts = useMemo(
    () => Array.from(new Set(items.map((item) => item.account.toLowerCase()))),
    [items]
  );

  const refreshBalances = useCallback(async () => {
    if (accounts.length === 0) return [];
    return getBalancesForAccountsAction(accounts);
  }, [accounts]);

  const checkout = useCallback(
    async (currency: PurchaseCurrency): Promise<CheckoutResult> => {
      const sessionId = ++sessionRef.current;
      setBusy(true);
      setError(null);
      setProgress([]);

      const updateProgress = (account: string, next: CheckoutProgress) => {
        if (sessionRef.current !== sessionId) return;
        setProgress((prev) => [...prev.filter((entry) => entry.account !== account), next]);
      };

      try {
        return await checkoutItems(items, currency, {
          onBroadcast: ({ account, txId }) =>
            updateProgress(account, {
              account,
              stage: "verifying",
              message: `Broadcasted ${txId}`,
            }),
          onVerified: ({ account, txId, success, message }) =>
            updateProgress(account, {
              account,
              stage: success ? "success" : "error",
              message: success
                ? `Confirmed ${txId}`
                : (message ?? `Waiting for confirmation: ${txId}`),
            }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Checkout failed";
        if (sessionRef.current === sessionId) {
          setError(message);
        }
        throw err;
      } finally {
        if (sessionRef.current === sessionId) {
          setBusy(false);
        }
      }
    },
    [items]
  );

  const reset = useCallback(() => {
    sessionRef.current += 1;
    setProgress([]);
    setError(null);
    setBusy(false);
  }, []);

  return {
    checkout,
    busy,
    error,
    progress,
    refreshBalances,
    reset,
  };
}
