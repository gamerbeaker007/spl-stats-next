"use server";

import {
  fetchMarketListingsByCard,
  fetchPlayerBalances,
  fetchSplPrices,
  fetchTransactionLookup,
} from "@/lib/backend/api/spl/spl-api";
import { lookupTransaction } from "@/lib/backend/api/spl/trxLookupParser";
import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import type {
  FetchMarketListingsByCardParams,
  LookupTransactionStatus,
  PurchasePlanItem,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMarketListingsByCardAction(params: FetchMarketListingsByCardParams) {
  const apiFoil = params.foil === 2 ? 1 : params.foil === 4 ? 3 : params.foil;

  const [listings, prices] = await Promise.all([
    fetchMarketListingsByCard({ ...params, foil: apiFoil }),
    fetchSplPrices(),
  ]);

  const decUsd = prices.dec > 0 ? prices.dec : 0;

  const filteredListings =
    params.foil === 2 || params.foil === 4
      ? listings.filter((listing) => listing.foil === params.foil)
      : listings;

  return filteredListings.map((listing) => {
    const priceUsd = listing.buy_price ?? 0;
    const priceDec = decUsd > 0 ? priceUsd / decUsd : 0;
    const priceCredits = priceUsd * 1000;
    const cc = listing.bcx ?? 1;

    return {
      marketId: listing.market_id,
      uid: listing.uid,
      cardDetailId: listing.card_detail_id,
      edition: listing.edition,
      foil: listing.foil,
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

export async function canSignForAccountAction(account: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const monitored = await getMonitoredAccounts();
  return monitored.some((entry) => entry.username === account.toLowerCase());
}

export async function getBalancesForAccountsAction(accounts: string[]) {
  const uniqueAccounts = Array.from(new Set(accounts.map((a) => a.toLowerCase())));
  const rows = await Promise.all(
    uniqueAccounts.map(async (account) => {
      const balances = await fetchPlayerBalances(account);
      return { account, balances };
    })
  );

  return rows;
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
      await sleep(intervalMs);
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

export async function getCartSummaryByAccountAction(items: PurchasePlanItem[]) {
  const byAccount = new Map<
    string,
    {
      account: string;
      itemCount: number;
      totalCc: number;
      totalDec: number;
      totalCredits: number;
    }
  >();

  for (const item of items) {
    const key = item.account.toLowerCase();
    const current = byAccount.get(key) ?? {
      account: key,
      itemCount: 0,
      totalCc: 0,
      totalDec: 0,
      totalCredits: 0,
    };

    current.itemCount += 1;
    current.totalCc += item.cc;
    current.totalDec += item.priceDec;
    current.totalCredits += item.priceCredits ?? 0;

    byAccount.set(key, current);
  }

  return Array.from(byAccount.values()).sort((a, b) => a.account.localeCompare(b.account));
}
