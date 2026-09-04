"use client";

import { waitForTransactionsAction } from "@/lib/backend/actions/purchase-actions";
import { withOperationPrefix } from "@/lib/shared/config/splApiConfig";
import type { WaitForTransactionsResult } from "@/types/purchase/purchase-plan";
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

/**
 * Wait for SPL to process broadcast tx IDs. Mirrors the retry-until-timeout
 * behavior used in the reference project.
 */
export async function waitForTransactions(txIds: string[]): Promise<WaitForTransactionsResult[]> {
  if (txIds.length === 0) return [];

  const confirmations = await waitForTransactionsAction(txIds);

  // Any still-unresolved (timed-out) txs are returned as-is for the caller to surface.
  return confirmations;
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
