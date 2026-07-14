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

async function broadcastCustomJson(
  account: string,
  operationId: string,
  payload: object
): Promise<string> {
  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found.");
  }

  const normalizedAccount = account.toLowerCase();
  const keychain = new KeychainSDK(win);
  const result = (await keychain.broadcast({
    username: normalizedAccount,
    operations: [
      [
        "custom_json",
        {
          required_auths: [normalizedAccount],
          required_posting_auths: [],
          id: withOperationPrefix(operationId),
          json: JSON.stringify(payload),
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
  return broadcastCustomJson(account, "sm_market_purchase", payload);
}

export async function broadcastCombineCards({
  account,
  payload,
}: BroadcastCombineCardsParams): Promise<string> {
  return broadcastCustomJson(account, "sm_combine_cards", payload);
}

export async function broadcastMarketplaceAssetPurchase(
  account: string,
  payload: MarketplacePurchasePayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_purchase", payload);
}

export async function broadcastTransferItems(
  account: string,
  payload: TransferItemsPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_transfer_items", payload);
}

export async function broadcastTransferSkins(
  account: string,
  payload: TransferSkinsPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_transfer_skins", payload);
}

export async function broadcastTokenTransfer(
  account: string,
  payload: TokenTransferPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_token_transfer", payload);
}

export async function broadcastMarketplaceList(
  account: string,
  payload: MarketplaceListPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_list", payload);
}

export async function broadcastMarketplaceCancel(
  account: string,
  payload: MarketplaceCancelPayload
): Promise<string> {
  return broadcastCustomJson(account, "sm_marketplace_cancel", payload);
}

export async function broadcastSetSkin(account: string, payload: SetSkinPayload): Promise<string> {
  return broadcastCustomJson(account, "sm_set_skin", payload);
}
