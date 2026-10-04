"use client";

import { TERMS_VERSION } from "@/lib/shared/terms";

export const GUEST_TERMS_ACK_STORAGE_KEY = "spl-guest-terms-ack-version";

interface GuestTermsPromptResult {
  accepted: boolean;
  dontShowAgain: boolean;
}

type GuestTermsPromptHandler = () => Promise<GuestTermsPromptResult>;

let promptHandler: GuestTermsPromptHandler | null = null;

export function registerGuestTermsPromptHandler(handler: GuestTermsPromptHandler): () => void {
  promptHandler = handler;
  return () => {
    if (promptHandler === handler) {
      promptHandler = null;
    }
  };
}

export function hasAcknowledgedGuestTermsVersion(): boolean {
  return localStorage.getItem(GUEST_TERMS_ACK_STORAGE_KEY) === TERMS_VERSION;
}

export function storeAcknowledgedGuestTermsVersion(): void {
  localStorage.setItem(GUEST_TERMS_ACK_STORAGE_KEY, TERMS_VERSION);
}

export async function ensureGuestTermsAcknowledgedForBroadcast(): Promise<void> {
  if (hasAcknowledgedGuestTermsVersion()) {
    return;
  }

  if (!promptHandler) {
    throw new Error("Unable to open Terms acknowledgement. Transaction aborted.");
  }

  const result = await promptHandler();
  if (!result.accepted) {
    throw new Error("Transaction aborted.");
  }

  if (result.dontShowAgain) {
    storeAcknowledgedGuestTermsVersion();
  }
}
