"use client";

import { KeychainKeyTypes, KeychainSDK } from "keychain-sdk";

interface HiveKeychainWindow extends Window {
  hive_keychain?: unknown;
}

/**
 * Signs an arbitrary message with the posting key of the given Hive account via Keychain.
 * Throws a descriptive error if Keychain is unavailable or the user rejects the request.
 */
export async function keychainSignBuffer(username: string, message: string): Promise<string> {
  const win = window as HiveKeychainWindow;
  if (!win?.hive_keychain) {
    throw new Error("Hive Keychain extension not found");
  }

  const keychain = new KeychainSDK(win);
  let result;
  try {
    result = await keychain.signBuffer({
      username: username.toLowerCase(),
      message,
      method: KeychainKeyTypes.posting,
    });
  } catch (err) {
    console.error("Keychain signing error:", err);
    console.error("Is instance of Error:", err instanceof Error);
    throw new Error(
      `Keychain error: ${"message" in (err as Error) ? (err as Error).message : String(err)}`
    );
  }

  if (!result?.success) {
    throw new Error("Keychain signature was rejected or failed");
  }

  const signature = typeof result.result === "string" ? result.result : result.message || "";
  if (!signature) {
    throw new Error("Keychain returned empty signature");
  }

  return signature;
}
