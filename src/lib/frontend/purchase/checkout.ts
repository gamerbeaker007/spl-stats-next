"use client";

import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { broadcastMarketPurchase, waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import type { PurchaseCurrency, PurchasePlanItem } from "@/types/purchase/purchase-plan";

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

export async function checkoutItems(
  items: PurchasePlanItem[],
  currency: PurchaseCurrency,
  options?: {
    onBroadcast?: (entry: {
      account: string;
      txId: string;
      items: Array<{ account: string; marketId: string }>;
    }) => void;
    onVerified?: (entry: {
      account: string;
      txId: string;
      success: boolean;
      message?: string;
    }) => void;
  }
): Promise<{ successfulItems: Array<{ account: string; marketId: string }> }> {
  if (items.length === 0) {
    return { successfulItems: [] };
  }

  const grouped = groupByAccount(items);
  const accounts = Array.from(grouped.keys());

  const balances = await getBalancesForAccountsAction(accounts);

  const txRows: Array<{ account: string; txId: string; items: PurchasePlanItem[] }> = [];

  for (const [account, accountItems] of grouped.entries()) {
    const total = accountItems.reduce(
      (sum, item) => sum + (currency === "DEC" ? item.priceDec : item.priceCredits),
      0
    );

    const available =
      currency === "DEC"
        ? (balances
            .find((row) => row.account === account)
            ?.balances.find((entry) => entry.token === "DEC")?.balance ?? 0) +
          (balances
            .find((row) => row.account === account)
            ?.balances.find((entry) => entry.token === "DEC-B")?.balance ?? 0)
        : (balances
            .find((row) => row.account === account)
            ?.balances.find((entry) => entry.token === currency)?.balance ?? 0);

    if (available < total) {
      throw new Error(
        `${account} has insufficient ${currency}. Needed ${total.toFixed(3)}, available ${available.toFixed(3)}.`
      );
    }

    const txId = await broadcastMarketPurchase({
      account,
      marketIds: accountItems.map((item) => item.marketId),
      currency,
      totalPrice: total,
    });

    txRows.push({ account, txId, items: accountItems });
    options?.onBroadcast?.({
      account,
      txId,
      items: accountItems.map((item) => ({ account: item.account, marketId: item.marketId })),
    });
  }

  const confirmations = await waitForTransactions(txRows.map((row) => row.txId));

  const successfulItems: Array<{ account: string; marketId: string }> = [];

  for (const txRow of txRows) {
    const confirmation = confirmations.find((entry) => entry.txId === txRow.txId);
    const success = Boolean(confirmation?.status.success);
    options?.onVerified?.({
      account: txRow.account,
      txId: txRow.txId,
      success,
      message: confirmation?.status.message,
    });

    if (success) {
      successfulItems.push(
        ...txRow.items.map((item) => ({ account: item.account, marketId: item.marketId }))
      );
    }
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

  return { successfulItems };
}
