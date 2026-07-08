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
const DEFAULT_INTERVAL_MS = 3_000;

const MAX_TX_IDS_PER_WAIT = 100;

function sleep(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, DEFAULT_INTERVAL_MS);
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
  txIds: string[]
): Promise<WaitForTransactionsResult[]> {
  const safeTxIds = txIds.slice(0, MAX_TX_IDS_PER_WAIT);

  const started = Date.now();
  const pending = new Set(safeTxIds);
  const resolved = new Map<string, WaitForTransactionsResult>();

  while (pending.size > 0 && Date.now() - started < DEFAULT_TIMEOUT_MS) {
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
      await sleep();
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

  return safeTxIds.map(
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
