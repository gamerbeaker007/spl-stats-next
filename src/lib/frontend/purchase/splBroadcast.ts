"use client";

import { getAuthStatus } from "@/lib/backend/actions/auth-actions";
import { ensureGuestTermsAcknowledgedForBroadcast } from "@/lib/frontend/guest-terms-ack";
import { fetchTransactionLookupInBrowser } from "@/lib/frontend/spl-browser-api";
import { withOperationPrefix } from "@/lib/shared/config/splApiConfig";
import { lookupTransactionStatus } from "@/lib/shared/trx-lookup-parser";
import type {
  LookupTransactionStatus,
  WaitForTransactionsResult,
} from "@/types/purchase/purchase-plan";
import type {
  CombineCardsPayload,
  MarketPurchasePayload,
  MarketplaceCancelPayload,
  MarketplaceListPayload,
  MarketplacePurchasePayload,
  SetSkinPayload,
  TokenTransferPayload,
  TransferItemsPayload,
  TransferSkinsPayload,
} from "@/types/skin-transactions";
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

async function ensureGuestCanBroadcast(): Promise<void> {
  const auth = await getAuthStatus();
  if (auth.authenticated) {
    return;
  }

  await ensureGuestTermsAcknowledgedForBroadcast();
}

/**
 * Single Keychain entry point for every `custom_json` the app broadcasts.
 * Applies the dev-mode operation prefix and returns the broadcast tx id.
 */
export async function broadcastCustomJson(
  account: string,
  operationId: string,
  payload: object,
  method: "active" | "posting"
): Promise<string> {
  await ensureGuestCanBroadcast();

  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found.");
  }

  const normalizedAccount = account.toLowerCase();
  const keychain = new KeychainSDK(win);

  const requireAuth =
    method === "active"
      ? {
          required_auths: [normalizedAccount],
          required_posting_auths: [],
        }
      : {
          required_auths: [],
          required_posting_auths: [normalizedAccount],
        };

  const result = (await keychain.broadcast({
    username: normalizedAccount,
    operations: [
      [
        "custom_json",
        {
          ...requireAuth,
          id: withOperationPrefix(operationId),
          json: JSON.stringify(payload),
        },
      ],
    ],
    method: method === "active" ? KeychainKeyTypes.active : KeychainKeyTypes.posting,
  })) as BroadcastResponse;

  if (!result?.success) {
    throw new Error(result?.message || result?.error || "Transaction broadcast failed");
  }

  const txId = result.result?.id ?? result.result?.tx_id;
  if (!txId) {
    throw new Error("No transaction id returned from Keychain broadcast");
  }

  return txId;
}

export interface BroadcastMarketPurchaseParams {
  account: string;
  payload: MarketPurchasePayload;
}

export interface BroadcastCombineCardsParams {
  account: string;
  payload: CombineCardsPayload;
}

const WAIT_TIMEOUT_MS = 120_000;
/** Delay between poll rounds: quick first checks, then back off (last value repeats). */
const POLL_DELAYS_MS = [3_000, 5_000, 8_000];
const MAX_TX_IDS_PER_WAIT = 100;

const PENDING_STATUS: LookupTransactionStatus = {
  ok: false,
  resolved: false,
  success: false,
  message: "Transaction not found yet",
};

/**
 * One lookup, from the browser so polling counts against the visitor's rate
 * limit, not the server's. Any failure (e.g. the visitor's own 429) just means
 * "not yet" — the next round retries until the timeout.
 */
async function lookupTransactionInBrowser(txId: string): Promise<LookupTransactionStatus> {
  try {
    return lookupTransactionStatus(await fetchTransactionLookupInBrowser(txId));
  } catch {
    return PENDING_STATUS;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll SPL until every broadcast tx ID resolves or the timeout passes.
 * Still-unresolved (timed-out) txs are returned as such for the caller to surface.
 */
export async function waitForTransactions(txIds: string[]): Promise<WaitForTransactionsResult[]> {
  const safeTxIds = txIds.slice(0, MAX_TX_IDS_PER_WAIT);
  if (safeTxIds.length === 0) return [];

  const started = Date.now();
  const pending = new Set(safeTxIds);
  const resolved = new Map<string, WaitForTransactionsResult>();

  for (let round = 0; pending.size > 0 && Date.now() - started < WAIT_TIMEOUT_MS; round++) {
    const checks = await Promise.all(
      Array.from(pending, async (txId) => ({
        txId,
        status: await lookupTransactionInBrowser(txId),
      }))
    );

    for (const check of checks) {
      if (!check.status.resolved) continue;
      pending.delete(check.txId);
      resolved.set(check.txId, check);
    }

    if (pending.size > 0) {
      await sleep(POLL_DELAYS_MS[Math.min(round, POLL_DELAYS_MS.length - 1)]);
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
          message: "Timed out waiting for transaction confirmation",
        },
      }
  );
}

export async function broadcastMarketPurchase({
  account,
  payload,
}: BroadcastMarketPurchaseParams): Promise<string> {
  return broadcastCustomJson(account, "sm_market_purchase", payload, "active");
}

export async function broadcastCombineCards({
  account,
  payload,
}: BroadcastCombineCardsParams): Promise<string> {
  return broadcastCustomJson(account, "sm_combine_cards", payload, "active");
}

export async function broadcastMarketplaceAssetPurchase(
  account: string,
  payload: MarketplacePurchasePayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_purchase", payload, "active");
}

export async function broadcastTransferItems(
  account: string,
  payload: TransferItemsPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_transfer_items", payload, "active");
}

export async function broadcastTransferSkins(
  account: string,
  payload: TransferSkinsPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_transfer_skins", payload, "active");
}

export async function broadcastTokenTransfer(
  account: string,
  payload: TokenTransferPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_token_transfer", payload, "active");
}

export async function broadcastMarketplaceList(
  account: string,
  payload: MarketplaceListPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_list", payload, "active");
}

export async function broadcastMarketplaceCancel(
  account: string,
  payload: MarketplaceCancelPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_cancel", payload, "active");
}

/**
 * A native Hive `transfer` (HIVE/HBD). Not an SPL operation — it never reaches
 * the SPL engine — but it goes through the same Keychain broadcast, so it lives
 * beside the custom_json broadcasts rather than in a second Keychain wrapper.
 */
export async function broadcastHiveTransfer(args: {
  account: string;
  to: string;
  amount: number;
  currency: "HIVE" | "HBD";
  memo: string;
}): Promise<string> {
  await ensureGuestCanBroadcast();

  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found.");
  }

  const from = args.account.toLowerCase();
  const keychain = new KeychainSDK(win);

  const result = (await keychain.broadcast({
    username: from,
    operations: [
      [
        "transfer",
        {
          from,
          to: args.to.toLowerCase(),
          // Hive requires exactly 3 decimals for HIVE/HBD amounts.
          amount: `${args.amount.toFixed(3)} ${args.currency}`,
          memo: args.memo,
        },
      ],
    ],
    method: KeychainKeyTypes.active,
  })) as BroadcastResponse;

  if (!result?.success) {
    throw new Error(result?.message || result?.error || "Transaction broadcast failed");
  }

  const txId = result.result?.id ?? result.result?.tx_id;
  if (!txId) {
    throw new Error("No transaction id returned from Keychain broadcast");
  }

  return txId;
}

export async function broadcastSetSkin(account: string, payload: SetSkinPayload): Promise<string> {
  return broadcastCustomJson(account, "sm_set_skin", payload, "posting");
}
