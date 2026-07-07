"use client";

import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { broadcastMarketPurchase, waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import type {
  PurchaseCurrency,
  PurchasePlanItem,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";
import { useCallback, useMemo, useRef, useState } from "react";

interface CheckoutProgress {
  account: string;
  stage: "idle" | "broadcasting" | "verifying" | "success" | "error";
  message?: string;
}

function groupByAccount(items: PurchasePlanItem[]): Map<string, PurchasePlanItem[]> {
  const grouped = new Map<string, PurchasePlanItem[]>();
  for (const item of items) {
    const key = item.account.toLowerCase();
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  }
  return grouped;
}

function balanceForToken(
  balancesByAccount: Array<{
    account: string;
    balances: Array<{ token: string; balance: number }>;
  }>,
  account: string,
  token: PurchaseCurrency
): number {
  const row = balancesByAccount.find((entry) => entry.account === account.toLowerCase());
  if (!row) return 0;
  if (token === "DEC") {
    return (
      (row.balances.find((entry) => entry.token === "DEC")?.balance ?? 0) +
      (row.balances.find((entry) => entry.token === "DEC-B")?.balance ?? 0)
    );
  }
  return row.balances.find((entry) => entry.token === token)?.balance ?? 0;
}

export function usePurchaseCheckout(items: PurchasePlanItem[]) {
  const [progress, setProgress] = useState<CheckoutProgress[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(0);

  const grouped = useMemo(() => groupByAccount(items), [items]);

  const refreshBalances = useCallback(async () => {
    const accounts = Array.from(grouped.keys());
    if (accounts.length === 0) return [];
    return getBalancesForAccountsAction(accounts);
  }, [grouped]);

  const checkout = useCallback(
    async (
      currency: PurchaseCurrency,
      options?: {
        onBroadcast?: (entry: {
          account: string;
          txId: string;
          items: Array<{ account: string; marketId: string }>;
        }) => void;
      }
    ): Promise<{
      confirmations: WaitForTransactionsResult[];
      successfulItems: Array<{ account: string; marketId: string }>;
    }> => {
      const sessionId = ++sessionRef.current;
      setBusy(true);
      setError(null);
      setProgress([]);

      const updateProgress = (account: string, next: CheckoutProgress) => {
        if (sessionRef.current !== sessionId) return;
        setProgress((prev) => [...prev.filter((entry) => entry.account !== account), next]);
      };

      try {
        const byAccount = Array.from(grouped.entries());
        const balances = await refreshBalances();

        for (const [account, accountItems] of byAccount) {
          const total = accountItems.reduce(
            (sum, item) => sum + (currency === "DEC" ? item.priceDec : item.priceCredits),
            0
          );

          const available = balanceForToken(balances, account, currency);
          if (available < total) {
            throw new Error(
              `${account} has insufficient ${currency}. Needed ${total.toFixed(3)}, available ${available.toFixed(3)}.`
            );
          }
        }

        const txByAccount: Array<{ account: string; txId: string; items: PurchasePlanItem[] }> = [];

        for (const [account, accountItems] of byAccount) {
          updateProgress(account, { account, stage: "broadcasting" });

          const txId = await broadcastMarketPurchase({
            account,
            currency,
            marketIds: accountItems.map((item) => item.marketId),
            totalPrice: accountItems.reduce(
              (sum, item) => sum + (currency === "DEC" ? item.priceDec : item.priceCredits),
              0
            ),
          });

          txByAccount.push({ account, txId, items: accountItems });
          options?.onBroadcast?.({
            account,
            txId,
            items: accountItems.map((item) => ({ account: item.account, marketId: item.marketId })),
          });

          updateProgress(account, { account, stage: "verifying", message: `Broadcasted ${txId}` });
        }

        const confirmations = await waitForTransactions(txByAccount.map((row) => row.txId));

        const successfulItems: Array<{ account: string; marketId: string }> = [];
        for (const row of txByAccount) {
          const confirmation = confirmations.find((entry) => entry.txId === row.txId);
          const success = Boolean(confirmation?.status.success);

          if (success) {
            successfulItems.push(
              ...row.items.map((item) => ({ account: item.account, marketId: item.marketId }))
            );
          }

          updateProgress(row.account, {
            account: row.account,
            stage: success ? "success" : "error",
            message: success
              ? `Confirmed ${row.txId}`
              : (confirmation?.status.message ?? `Waiting for confirmation: ${row.txId}`),
          });
        }

        if (successfulItems.length > 0) {
          const affectedAccounts = Array.from(
            new Set(successfulItems.map((item) => item.account.toLowerCase()))
          );
          await revalidateTagsAction([
            { type: "collection", usernames: affectedAccounts },
            { type: "balances", usernames: affectedAccounts },
            { type: "grouped-market" },
          ]);
        }

        return { confirmations, successfulItems };
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
    [grouped, refreshBalances]
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
