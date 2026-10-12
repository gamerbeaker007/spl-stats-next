"use client";

import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import type { CacheInvalidationTarget } from "@/lib/backend/cache/cache-tags";
import {
  broadcastMarketPurchase,
  broadcastMarketplaceAssetPurchase,
  waitForTransactions,
} from "@/lib/frontend/purchase/splBroadcast";
import { buildLandPurchasePayload } from "@/lib/frontend/purchase/payload-builders";
import { type AccountBalances, fetchBalancesForAccounts } from "@/lib/frontend/spl-browser-api";
import { tokenBalance } from "@/lib/shared/marketplace-purchase";
import { buildMarketPurchasePayload } from "@/lib/shared/transactions-builder";
import {
  isCardPurchaseItem,
  isLandPurchaseItem,
  type PurchaseCurrency,
  type PurchasePlanItem,
  type WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";

type BalancesByAccount = AccountBalances[];

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
  /** Land listings found sold/delisted during pre-broadcast validation — safe to drop. */
  unavailableItems: Array<{ account: string; marketId: string }>;
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

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Caches touched by the confirmed purchases: per kind, per buying account. */
function invalidationTargets(
  items: PurchasePlanItem[],
  successfulItems: Array<{ account: string; marketId: string }>
): CacheInvalidationTarget[] {
  const purchased = new Set(
    successfulItems.map((item) => `${item.account.toLowerCase()}::${item.marketId}`)
  );
  const bought = items.filter((item) =>
    purchased.has(`${item.account.toLowerCase()}::${item.marketId}`)
  );
  const accountsOf = (subset: PurchasePlanItem[]) =>
    Array.from(new Set(subset.map((item) => item.account.toLowerCase())));

  const cardAccounts = accountsOf(bought.filter(isCardPurchaseItem));
  const landAccounts = accountsOf(bought.filter(isLandPurchaseItem));
  // Balances are read live in the browser, so there is no balance cache to invalidate.
  const targets: CacheInvalidationTarget[] = [];

  if (cardAccounts.length > 0) {
    targets.push({ type: "collection", usernames: cardAccounts }, { type: "grouped-market" });
  }
  if (landAccounts.length > 0) {
    targets.push({ type: "land-market" }, { type: "land-owned", usernames: landAccounts });
  }
  return targets;
}

export function availableBalance(
  balancesByAccount: BalancesByAccount,
  account: string,
  currency: PurchaseCurrency
): number {
  const row = balancesByAccount.find((entry) => entry.account === account.toLowerCase());
  if (!row) return 0;

  // Only the liquid balance can fund a purchase — staked DEC-B is not spendable.
  return tokenBalance(row.balances, currency);
}

/**
 * Broadcast one market-purchase transaction per account, wait for confirmation,
 * then invalidate the affected collection / land caches.
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
    return { confirmations: [], successfulItems: [], unavailableItems: [] };
  }

  const grouped = Array.from(groupByAccount(items).entries());
  const balances = await fetchBalancesForAccounts(grouped.map(([account]) => account));

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
  const unavailableItems: Array<{ account: string; marketId: string }> = [];

  // Cards and land deeds are different SPL operations (`sm_market_purchase` vs
  // `sm_marketplace_purchase`), so each kind is broadcast as its own transaction.
  async function broadcastChunk(
    account: string,
    chunk: PurchasePlanItem[],
    buildAndBroadcast: () => Promise<string>
  ) {
    try {
      const txId = await buildAndBroadcast();
      txRows.push({ account, txId, items: chunk });
      callbacks?.onBroadcast?.({
        account,
        txId,
        items: chunk.map((item) => ({ account: item.account, marketId: item.marketId })),
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

  for (const [account, accountItems] of grouped) {
    const cardItems = accountItems.filter(isCardPurchaseItem);
    for (const purchaseChunk of chunkItems(cardItems, MAX_MARKET_ITEMS_PER_TX)) {
      await broadcastChunk(account, purchaseChunk, async () => {
        const payload = buildMarketPurchasePayload({
          marketIds: purchaseChunk.map((item) => item.marketId),
          currency,
          totalPrice: accountTotal(purchaseChunk, currency),
        });
        return broadcastMarketPurchase({ account, payload });
      });
    }

    const landItems = accountItems.filter(isLandPurchaseItem);
    for (const purchaseChunk of chunkItems(landItems, MAX_MARKET_ITEMS_PER_TX)) {
      await broadcastChunk(account, purchaseChunk, async () => {
        const result = await buildLandPurchasePayload({
          account,
          currency,
          items: purchaseChunk.map((item) => ({
            listingItemId: item.listingItemId,
            detailId: item.detailId,
            priceUsd: item.priceUsd,
          })),
        });
        if (!result.ok) {
          const gone = new Set(result.unavailableListingItemIds);
          unavailableItems.push(
            ...purchaseChunk
              .filter((item) => gone.has(item.listingItemId))
              .map((item) => ({ account: item.account, marketId: item.marketId }))
          );
          throw new Error(result.error);
        }
        return broadcastMarketplaceAssetPurchase(account, result.payload);
      });
    }
  }

  if (txRows.length === 0 && broadcastFailures.length > 0 && unavailableItems.length === 0) {
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
    await revalidateTagsAction(invalidationTargets(items, successfulItems));
  }

  return { confirmations, successfulItems, unavailableItems };
}
