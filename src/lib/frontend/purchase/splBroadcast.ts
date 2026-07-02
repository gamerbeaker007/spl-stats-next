"use client";

import { waitForTransactionsAction } from "@/lib/backend/actions/purchase-actions";
import { splApiConfig, withOperationPrefix } from "@/lib/shared/config/splApiConfig";
import type { PurchaseCurrency, WaitForTransactionsResult } from "@/types/purchase/purchase-plan";
import { KeychainKeyTypes, KeychainSDK } from "keychain-sdk";

interface HiveKeychainWindow extends Window {
  hive_keychain?: unknown;
}

interface BroadcastResponse {
  success?: boolean;
  error?: string;
  message?: string;
  result?: {
    id?: string;
    tx_id?: string;
  };
}

export const MARKET = "spl-stats.com";
const VERIFY_POLL_MS = 3000;
const VERIFY_TIMEOUT_MS = 120000;

function getNonce(): number {
  return Date.now();
}

function getAppName(): string {
  return splApiConfig.mode === "test" ? `${splApiConfig.app}/dev` : splApiConfig.app;
}

export interface BroadcastMarketPurchaseParams {
  account: string;
  marketIds: string[];
  currency: PurchaseCurrency;
  totalPrice: number;
}

/**
 * Wait for SPL to process broadcast tx IDs. Mirrors the retry-until-timeout
 * behavior used in the reference project.
 */
export async function waitForTransactions(txIds: string[]): Promise<WaitForTransactionsResult[]> {
  if (txIds.length === 0) return [];

  const confirmations = await waitForTransactionsAction(txIds, VERIFY_TIMEOUT_MS, VERIFY_POLL_MS);

  const failed = confirmations.filter((entry) => entry.status.resolved && !entry.status.success);
  if (failed.length > 0) {
    throw new Error(
      failed
        .map((entry) => `${entry.txId}: ${entry.status.message ?? "Transaction failed"}`)
        .join("\n")
    );
  }

  const unresolved = confirmations.filter((entry) => !entry.status.resolved);
  if (unresolved.length > 0) {
    return confirmations;
  }

  return confirmations;
}

export async function broadcastMarketPurchase({
  account,
  marketIds,
  currency,
  totalPrice,
}: BroadcastMarketPurchaseParams): Promise<string> {
  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found.");
  }

  if (marketIds.length === 0) {
    throw new Error("No listings selected for purchase.");
  }

  const keychain = new KeychainSDK(win);
  const result = (await keychain.broadcast({
    username: account.toLowerCase(),
    operations: [
      [
        "custom_json",
        {
          required_auths: [account.toLowerCase()],
          required_posting_auths: [],
          id: withOperationPrefix("sm_market_purchase"),
          json: JSON.stringify({
            items: marketIds,
            currency,
            price: Number(totalPrice.toFixed(3)),
            market: MARKET,
            app: getAppName(),
            n: getNonce(),
          }),
        },
      ],
    ],
    method: KeychainKeyTypes.active,
  })) as BroadcastResponse;

  if (!result?.success) {
    throw new Error(result?.message || result?.error || "Market purchase broadcast failed");
  }

  const txId = result.result?.id ?? result.result?.tx_id;
  if (!txId) {
    throw new Error("No transaction id returned from Keychain broadcast");
  }

  return txId;
}
