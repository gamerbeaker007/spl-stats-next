"use server";

import { DONATION_ACCOUNT, type DonationCurrency } from "@/constants/support";
import { getAuthStatus } from "@/lib/backend/actions/auth-actions";
import {
  fetchHiveAccountBalances,
  fetchHiveTransfer,
} from "@/lib/backend/api/hive/hive-account-api";
import {
  fetchPlayerBalances,
  fetchSplPrices,
  fetchTransactionLookup,
} from "@/lib/backend/api/spl/spl-api";
import { parseTokenTransfer } from "@/lib/backend/api/spl/trxLookupParser";
import {
  fetchValidatorVotesByAccount,
  type ValidatorVote,
} from "@/lib/backend/api/spl/spl-validator-api";
import { createSupportDonation, findSupportDonationByTx } from "@/lib/backend/db/support-donations";
import logger from "@/lib/backend/log/logger.server";

export type DonationRecordResult =
  | { status: "success"; donationId: string }
  | { status: "already_recorded" }
  | { status: "pending"; message: string }
  | { status: "error"; error: string };

// Deliberately does not say "try again": the transfer has already been
// broadcast, so re-submitting the form would send a second donation.
const PENDING_MESSAGE =
  "Your transaction was broadcast successfully but is not confirmed yet, so it could not be recorded. Your funds were sent — do not donate again.";

/** Hive blocks are 3s; a transfer is retrievable within a handful of them. */
const HIVE_LOOKUP_POLL_MS = 3_000;
const HIVE_LOOKUP_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const sameAccount = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export async function getValidatorVotes(): Promise<{
  votes: ValidatorVote[];
  error?: string;
}> {
  const auth = await getAuthStatus();
  if (!auth.authenticated || !auth.username) {
    return { votes: [], error: "Not authenticated" };
  }

  try {
    const votes = await fetchValidatorVotesByAccount(auth.username);
    return { votes };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(`[support] validator votes failed for ${auth.username}: ${message}`);
    return { votes: [], error: message };
  }
}

export async function getSupportBalances(): Promise<{
  dec: number;
  sps: number;
  hive: number;
  hbd: number;
  error?: string;
}> {
  const auth = await getAuthStatus();
  if (!auth.authenticated || !auth.username) {
    return { dec: 0, sps: 0, hive: 0, hbd: 0, error: "Not authenticated" };
  }

  const [spl, hive] = await Promise.allSettled([
    fetchPlayerBalances(auth.username),
    fetchHiveAccountBalances(auth.username),
  ]);

  const errors: string[] = [];
  let dec = 0;
  let sps = 0;
  let hiveBalance = 0;
  let hbdBalance = 0;

  if (spl.status === "fulfilled") {
    dec = spl.value.find((entry) => entry.token === "DEC")?.balance ?? 0;
    sps = spl.value.find((entry) => entry.token === "SPS")?.balance ?? 0;
  } else {
    errors.push("Could not load DEC/SPS balances");
  }

  if (hive.status === "fulfilled") {
    hiveBalance = hive.value.hive;
    hbdBalance = hive.value.hbd;
  } else {
    errors.push("Could not load HIVE/HBD balances");
  }

  return {
    dec,
    sps,
    hive: hiveBalance,
    hbd: hbdBalance,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// ── Donation recording ───────────────────────────────────────────────────────
//
// Both flows have the same shape: the client hands over nothing but a
// transaction id, and the server reads back what actually moved before it writes
// a row. Nothing the browser claims about the amount, the token or the recipient
// is trusted. Only the authoritative source differs:
//
//   DEC / SPS  → sm_token_transfer, settled by the SPL engine, read through the
//                shared fetchTransactionLookup / parseTokenTransfer pipeline.
//   HIVE / HBD → a native Hive transfer that never reaches the SPL engine, read
//                back off the chain with fetchHiveTransfer.

/** Guard shared by both flows: authenticated, usable tx id, not already stored. */
async function beginRecording(
  txId: string
): Promise<
  { ok: true; username: string; txId: string } | { ok: false; result: DonationRecordResult }
> {
  const auth = await getAuthStatus();
  if (!auth.authenticated || !auth.username) {
    return { ok: false, result: { status: "error", error: "Not authenticated" } };
  }

  const cleanTx = typeof txId === "string" ? txId.trim() : "";
  if (!cleanTx) {
    return { ok: false, result: { status: "error", error: "Transaction ID is required" } };
  }

  if (await findSupportDonationByTx(cleanTx)) {
    return { ok: false, result: { status: "already_recorded" } };
  }

  return { ok: true, username: auth.username, txId: cleanTx };
}

/** Shared tail: price the confirmed transfer in USD and store it. */
async function storeDonation(input: {
  username: string;
  currency: DonationCurrency;
  amount: number;
  txId: string;
  date: Date;
}): Promise<DonationRecordResult> {
  let prices;
  try {
    prices = await fetchSplPrices();
  } catch (error) {
    logger.error("[support] failed to fetch prices for donation", {
      error: error instanceof Error ? error.message : String(error),
      txId: input.txId,
    });
    return { status: "error", error: "Could not fetch token prices. Please try again." };
  }

  // Every donation currency is one of the price feed's keys by construction.
  const usdPrice = prices[input.currency.toLowerCase() as Lowercase<DonationCurrency>] ?? 0;
  // The transfer has already settled on-chain by this point, so an unusable
  // price must not lose the record — store it unpriced and flag it instead.
  const usdValue = Number.isFinite(usdPrice) && usdPrice > 0 ? input.amount * usdPrice : 0;
  if (usdValue === 0) {
    logger.warn(`[support] no USD price for ${input.currency}; storing donation unpriced`, {
      txId: input.txId,
    });
  }

  try {
    const created = await createSupportDonation({
      date: input.date,
      username: input.username,
      currency: input.currency,
      amount: input.amount,
      usdValue,
      tx: input.txId,
    });
    logger.info(
      `[support] recorded ${input.amount} ${input.currency} donation from ${input.username} (tx=${input.txId})`
    );
    return { status: "success", donationId: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Unique constraint violation = recorded concurrently by another request.
    if (message.includes("Unique") || message.includes("duplicate")) {
      return { status: "already_recorded" };
    }
    logger.error("[support] failed to insert donation", { error: message, txId: input.txId });
    return { status: "error", error: "Failed to save donation" };
  }
}

/** Records a DEC or SPS donation from its `sm_token_transfer` transaction. */
export async function recordTokenTransferDonation(txId: string): Promise<DonationRecordResult> {
  const start = await beginRecording(txId);
  if (!start.ok) return start.result;

  // A single lookup, not a poll: the client already waited on this transaction
  // with `waitForTransactions` before calling in. This call is the server-side
  // verification of what actually moved, not a second waiting room.
  const outcome = parseTokenTransfer(await fetchTransactionLookup(start.txId));

  if (outcome.status === "pending") return { status: "pending", message: PENDING_MESSAGE };
  if (outcome.status === "failed") return { status: "error", error: outcome.error };

  const { from, to, token, amount, date } = outcome.transfer;

  if (!sameAccount(from, start.username)) {
    return {
      status: "error",
      error: "Transaction sender does not match the authenticated account",
    };
  }
  if (!sameAccount(to, DONATION_ACCOUNT)) {
    return { status: "error", error: "Transaction recipient is not the donation account" };
  }
  if (token !== "DEC" && token !== "SPS") {
    return {
      status: "error",
      error: `Unsupported token: ${token}. Only DEC and SPS are accepted.`,
    };
  }

  return storeDonation({ username: from, currency: token, amount, txId: start.txId, date });
}

/** Records a HIVE or HBD donation from its native Hive transfer transaction. */
export async function recordHiveTransferDonation(txId: string): Promise<DonationRecordResult> {
  const start = await beginRecording(txId);
  if (!start.ok) return start.result;

  // Unlike the SPL path there is no client-side wait to lean on — nothing in the
  // browser can see a native Hive transfer — so the wait happens here.
  const deadline = Date.now() + HIVE_LOOKUP_TIMEOUT_MS;
  let transfer = await fetchHiveTransfer(start.txId);
  while (!transfer && Date.now() + HIVE_LOOKUP_POLL_MS < deadline) {
    await sleep(HIVE_LOOKUP_POLL_MS);
    transfer = await fetchHiveTransfer(start.txId);
  }
  if (!transfer) return { status: "pending", message: PENDING_MESSAGE };

  if (!sameAccount(transfer.from, start.username)) {
    return {
      status: "error",
      error: "Transaction sender does not match the authenticated account",
    };
  }
  if (!sameAccount(transfer.to, DONATION_ACCOUNT)) {
    return { status: "error", error: "Transaction recipient is not the donation account" };
  }

  return storeDonation({
    username: transfer.from,
    currency: transfer.currency,
    amount: transfer.amount,
    txId: start.txId,
    date: new Date(),
  });
}
