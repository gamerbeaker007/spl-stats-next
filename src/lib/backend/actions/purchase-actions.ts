"use server";

import {
  fetchMarketListingsByCard,
  fetchPlayerBalances,
  fetchSplPrices,
  fetchTransactionLookup,
} from "@/lib/backend/api/spl/spl-api";
import { lookupTransaction } from "@/lib/backend/api/spl/trxLookupParser";
import { toCardFoil } from "@/lib/shared/card-utils";
import type {
  FetchMarketListingsByCardParams,
  LookupTransactionStatus,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";

const DEFAULT_TIMEOUT_MS = 120_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;

const DEFAULT_INTERVAL_MS = 2_000;
const MIN_INTERVAL_MS = 200;
const MAX_INTERVAL_MS = 10_000;

function clampTimeout(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.trunc(ms), MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
}

function clampInterval(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_INTERVAL_MS;
  return Math.min(Math.max(Math.trunc(ms), MIN_INTERVAL_MS), MAX_INTERVAL_MS);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, clampTimeout(delayMs));
  });
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
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS
): Promise<WaitForTransactionsResult[]> {
  const safeTimeoutMs = clampTimeout(timeoutMs);
  const safeIntervalMs = clampInterval(intervalMs);

  const started = Date.now();
  const pending = new Set(txIds);
  const resolved = new Map<string, WaitForTransactionsResult>();

  while (pending.size > 0 && Date.now() - started < safeTimeoutMs) {
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
