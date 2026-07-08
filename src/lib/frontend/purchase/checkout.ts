"use client";

import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { getBalancesForAccountsAction } from "@/lib/backend/actions/purchase-actions";
import { broadcastMarketPurchase, waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import type {
  PurchaseCurrency,
  PurchasePlanItem,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";

type BalancesByAccount = Awaited<ReturnType<typeof getBalancesForAccountsAction>>;

export interface CheckoutCallbacks {
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

export interface CheckoutResult {
  confirmations: WaitForTransactionsResult[];
  successfulItems: Array<{ account: string; marketId: string }>;
}

// Keep market purchase payloads within SPL transaction limits by splitting
// large per-account plans into multiple broadcasts.
const MAX_MARKET_ITEMS_PER_TX = 100;

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

function accountTotal(items: PurchasePlanItem[], currency: PurchaseCurrency): number {
  return items.reduce(
    (sum, item) => sum + (currency === "DEC" ? item.priceDec : item.priceCredits),
    0
  );
}

function chunkItems(items: PurchasePlanItem[], size: number): PurchasePlanItem[][] {
  if (size <= 0) return [items];

  const chunks: PurchasePlanItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function availableBalance(
  balancesByAccount: BalancesByAccount,
  account: string,
  currency: PurchaseCurrency
): number {
  const row = balancesByAccount.find((entry) => entry.account === account.toLowerCase());
  if (!row) return 0;

  // Only the liquid balance can fund a purchase — staked DEC-B is not spendable.
  return row.balances.find((entry) => entry.token === currency)?.balance ?? 0;
}

/**
 * Broadcast one market-purchase transaction per account, wait for confirmation,
 * then invalidate the affected collection/balance caches.
 *
 * Balances for every account are verified up front so a later insufficient-balance
 * failure never leaves an earlier account already charged.
 */
export async function checkoutItems(
  items: PurchasePlanItem[],
  currency: PurchaseCurrency,
  callbacks?: CheckoutCallbacks
): Promise<CheckoutResult> {
  if (items.length === 0) {
    return { confirmations: [], successfulItems: [] };
  }

  const grouped = Array.from(groupByAccount(items).entries());
  const balances = await getBalancesForAccountsAction(grouped.map(([account]) => account));

  for (const [account, accountItems] of grouped) {
    const total = accountTotal(accountItems, currency);
    const available = availableBalance(balances, account, currency);
    if (available < total) {
      throw new Error(
        `${account} has insufficient ${currency}. Needed ${total.toFixed(3)}, available ${available.toFixed(3)}.`
      );
    }
  }

  const txRows: Array<{ account: string; txId: string; items: PurchasePlanItem[] }> = [];
  const broadcastFailures: WaitForTransactionsResult[] = [];
  for (const [account, accountItems] of grouped) {
    const purchaseChunks = chunkItems(accountItems, MAX_MARKET_ITEMS_PER_TX);
    for (const purchaseChunk of purchaseChunks) {
      try {
        const txId = await broadcastMarketPurchase({
          account,
          marketIds: purchaseChunk.map((item) => item.marketId),
          currency,
          totalPrice: accountTotal(purchaseChunk, currency),
        });

        txRows.push({ account, txId, items: purchaseChunk });
        callbacks?.onBroadcast?.({
          account,
          txId,
          items: purchaseChunk.map((item) => ({ account: item.account, marketId: item.marketId })),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Market purchase broadcast failed";
        const failureTxId = `broadcast:${account}`;
        broadcastFailures.push({
          txId: failureTxId,
          status: {
            ok: false,
            resolved: true,
            success: false,
            message,
          },
        });
        callbacks?.onVerified?.({
          account,
          txId: failureTxId,
          success: false,
          message,
        });
      }
    }
  }

  if (txRows.length === 0 && broadcastFailures.length > 0) {
    throw new Error(
      broadcastFailures
        .map((entry) => entry.status.message ?? `${entry.txId}: broadcast failed`)
        .join("\n")
    );
  }

  const verifiedConfirmations =
    txRows.length > 0 ? await waitForTransactions(txRows.map((row) => row.txId)) : [];
  const confirmations = [...verifiedConfirmations, ...broadcastFailures];

  const successfulItems: Array<{ account: string; marketId: string }> = [];
  for (const txRow of txRows) {
    const confirmation = verifiedConfirmations.find((entry) => entry.txId === txRow.txId);
    const success = Boolean(confirmation?.status.success);
    callbacks?.onVerified?.({
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

  return { confirmations, successfulItems };
}
