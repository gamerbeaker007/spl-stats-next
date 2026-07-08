"use server";

import {
  fetchMarketListingsByCard,
  fetchPlayerBalances,
  fetchSplPrices,
  fetchTransactionLookup,
} from "@/lib/backend/api/spl/spl-api";
import { lookupTransaction } from "@/lib/backend/api/spl/trxLookupParser";
import type {
  FetchMarketListingsByCardParams,
  LookupTransactionStatus,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";
import { toCardFoil } from "@/lib/shared/card-utils";

const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 300000;
const MIN_INTERVAL_MS = 200;
const MAX_INTERVAL_MS = 10000;

function sleep(ms: number): Promise<void> {
  const safeTimeoutMs = Number.isFinite(ms)
    ? Math.min(Math.max(ms, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
    : 120000;

  return new Promise((resolve) => setTimeout(resolve, safeTimeoutMs));
}

export async function getMarketListingsByCardAction(params: FetchMarketListingsByCardParams) {
  const [listings, prices] = await Promise.all([
    fetchMarketListingsByCard({ ...params }),
    fetchSplPrices(),
  ]);

  const decUsd = Math.max(prices.dec, 0);

  return listings.map((listing) => {
    const priceUsd = listing.buy_price ?? 0;
    const priceDec = decUsd > 0 ? priceUsd / decUsd : 0;
    const priceCredits = priceUsd * 1000;
    const cc = listing.bcx ?? 1;

    return {
      marketId: listing.market_id,
      uid: listing.uid,
      cardDetailId: listing.card_detail_id,
      edition: listing.edition,
      foil: toCardFoil(listing.foil),
      level: listing.level,
      cc,
      priceUsd,
      priceDec,
      priceCredits,
      pricePerCcDec: cc > 0 ? priceDec / cc : priceDec,
      seller: listing.seller,
    };
  });
}

export async function getBalancesForAccountsAction(accounts: string[]) {
  const uniqueAccounts = Array.from(new Set(accounts.map((a) => a.toLowerCase())));

  return await Promise.all(
    uniqueAccounts.map(async (account) => {
      const balances = await fetchPlayerBalances(account);
      return { account, balances };
    })
  );
}

export async function lookupTransactionAction(txId: string): Promise<LookupTransactionStatus> {
  const raw = await fetchTransactionLookup(txId);
  if (!raw) {
    return {
      ok: false,
      resolved: false,
      success: false,
      message: "Transaction not found yet",
    };
  }

  return lookupTransaction(raw);
}

export async function waitForTransactionsAction(
  txIds: string[],
  timeoutMs = 120000,
  intervalMs = 2000
): Promise<WaitForTransactionsResult[]> {
  const safeIntervalMs = Number.isFinite(intervalMs)
    ? Math.min(Math.max(intervalMs, MIN_INTERVAL_MS), MAX_INTERVAL_MS)
    : 2000;

  const started = Date.now();
  const pending = new Set(txIds);
  const resolved = new Map<string, WaitForTransactionsResult>();

  while (pending.size > 0 && Date.now() - started < timeoutMs) {
    const checks = await Promise.all(
      Array.from(pending.values()).map(async (txId) => ({
        txId,
        status: await lookupTransactionAction(txId),
      }))
    );

    for (const check of checks) {
      if (!check.status.resolved) continue;
      pending.delete(check.txId);
      resolved.set(check.txId, {
        txId: check.txId,
        status: check.status,
      });
    }

    if (pending.size > 0) {
      await sleep(safeIntervalMs);
    }
  }

  if (pending.size > 0) {
    for (const txId of pending) {
      resolved.set(txId, {
        txId,
        status: {
          ok: false,
          resolved: false,
          success: false,
          message: "Timed out waiting for transaction confirmation",
        },
      });
    }
  }

  return txIds.map(
    (txId) =>
      resolved.get(txId) ?? {
        txId,
        status: {
          ok: false,
          resolved: false,
          success: false,
          message: "Transaction did not resolve",
        },
      }
  );
}
