"use client";

import { withOperationPrefix } from "@/lib/shared/config/splApiConfig";
import type { Operation } from "@hiveio/dhive";
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

export interface BroadcastResult {
  success: boolean;
  txId?: string;
  error?: string;
}

type HiveOperation = [string, object];

function withPrefixedCustomJson(op: HiveOperation): HiveOperation {
  if (op[0] !== "custom_json") return op;
  const body = op[1] as { id?: string };
  if (!body.id) return op;
  return [
    op[0],
    {
      ...body,
      id: withOperationPrefix(body.id),
    },
  ];
}

export async function broadcastSupportOperation(
  username: string,
  operation: HiveOperation,
  keyType: "active" | "posting" = "active"
): Promise<BroadcastResult> {
  try {
    const win = window as HiveKeychainWindow;
    if (!win?.hive_keychain) {
      return {
        success: false,
        error: "Hive Keychain extension not found.",
      };
    }

    const keychain = new KeychainSDK(win);
    const prepared = withPrefixedCustomJson(operation) as Operation;

    const result = (await keychain.broadcast({
      username: username.toLowerCase(),
      operations: [prepared],
      method: keyType === "active" ? KeychainKeyTypes.active : KeychainKeyTypes.posting,
    })) as BroadcastResponse;

    if (!result?.success) {
      return {
        success: false,
        error: result?.message || result?.error || "Transaction broadcast failed",
      };
    }

    const txId = result.result?.id ?? result.result?.tx_id;
    if (!txId) {
      return {
        success: false,
        error: "No transaction ID returned from Keychain",
      };
    }

    return { success: true, txId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown broadcast error",
    };
  }
}
