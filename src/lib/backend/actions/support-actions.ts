"use server";

import { DONATION_ACCOUNT } from "@/constants/support";
import { getAuthStatus } from "@/lib/backend/actions/auth-actions";
import { fetchHiveAccountBalances } from "@/lib/backend/api/hive/hive-account-api";
import { fetchPlayerBalances, fetchSplPrices } from "@/lib/backend/api/spl/spl-api";
import {
  fetchRawTokenTransfer,
  parseTokenTransferTrxInfo,
} from "@/lib/backend/api/spl/spl-support-api";
import {
  fetchValidatorVotesByAccount,
  type ValidatorVote,
} from "@/lib/backend/api/spl/spl-validator-api";
import logger from "@/lib/backend/log/logger.server";
import prisma from "@/lib/prisma";

type RecordResult =
  | { status: "success"; donationId: string }
  | { status: "already_recorded" }
  | { status: "pending"; message: string }
  | { status: "error"; error: string };

const LOOKUP_RETRIES = 4;
const LOOKUP_RETRY_MS = 1500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toDbDecimal(value: number, decimals = 8): string {
  return value.toFixed(decimals);
}

async function findDonationByTx(tx: string) {
  return prisma.supportDonation.findUnique({ where: { tx } });
}

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
    return {
      dec: 0,
      sps: 0,
      hive: 0,
      hbd: 0,
      error: "Not authenticated",
    };
  }

  const [spl, hive] = await Promise.allSettled([
    fetchPlayerBalances(auth.username),
    fetchHiveAccountBalances(auth.username),
  ]);

  let dec = 0;
  let sps = 0;
  let hiveBalance = 0;
  let hbdBalance = 0;
  const errors: string[] = [];

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

export async function recordTokenTransferDonation(txId: string): Promise<RecordResult> {
  const auth = await getAuthStatus();
  if (!auth.authenticated || !auth.username) {
    return { status: "error", error: "Not authenticated" };
  }

  const cleanTx = txId.trim();
  if (!cleanTx) {
    return { status: "error", error: "Transaction ID is required" };
  }

  const duplicate = await findDonationByTx(cleanTx);
  if (duplicate) {
    return { status: "already_recorded" };
  }

  let raw = null;
  for (let attempt = 0; attempt < LOOKUP_RETRIES; attempt++) {
    raw = await fetchRawTokenTransfer(cleanTx);
    if (raw) break;
    await sleep(LOOKUP_RETRY_MS);
  }

  if (!raw) {
    return {
      status: "pending",
      message:
        "Your transaction was broadcast successfully but is still being confirmed. Please try again in a few seconds.",
    };
  }

  const parsed = parseTokenTransferTrxInfo(raw);
  if (!parsed.ok) {
    if (parsed.pending) {
      return {
        status: "pending",
        message: "Transaction is still confirming. Please try again shortly.",
      };
    }
    return { status: "error", error: parsed.error };
  }

  const from = parsed.data.from.toLowerCase();
  const to = parsed.data.to.toLowerCase();
  const token = parsed.data.token.toUpperCase();
  const amount = parsed.data.amount;

  if (from !== auth.username.toLowerCase()) {
    return {
      status: "error",
      error: "Transaction sender does not match the authenticated account",
    };
  }

  if (to !== DONATION_ACCOUNT.toLowerCase()) {
    return {
      status: "error",
      error: "Transaction recipient is not the donation account",
    };
  }

  if (token !== "DEC" && token !== "SPS") {
    return {
      status: "error",
      error: "Only DEC and SPS token transfers can be recorded with this method",
    };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      status: "error",
      error: "Invalid transaction amount",
    };
  }

  let prices;
  try {
    prices = await fetchSplPrices();
  } catch {
    return {
      status: "error",
      error: "Could not fetch token prices. Please try again.",
    };
  }

  const usdPrice = token === "DEC" ? prices.dec : prices.sps;
  if (!Number.isFinite(usdPrice) || usdPrice <= 0) {
    return {
      status: "error",
      error: `No valid USD price available for ${token}`,
    };
  }

  const usdValue = amount * usdPrice;

  try {
    const created = await prisma.supportDonation.create({
      data: {
        date: parsed.data.date,
        username: from,
        currency: token,
        amount: toDbDecimal(amount),
        usdValue: toDbDecimal(usdValue),
        tx: cleanTx,
      },
    });
    return { status: "success", donationId: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique") || message.includes("duplicate")) {
      return { status: "already_recorded" };
    }
    logger.error("[support] failed to insert DEC/SPS donation", {
      error: message,
      txId: cleanTx,
    });
    return { status: "error", error: "Failed to save donation" };
  }
}

export async function recordHiveTransferDonation(input: {
  txId: string;
  currency: string;
  amount: number;
}): Promise<RecordResult> {
  const auth = await getAuthStatus();
  if (!auth.authenticated || !auth.username) {
    return { status: "error", error: "Not authenticated" };
  }

  const txId = input.txId.trim();
  const currency = input.currency.toUpperCase();
  const amount = input.amount;

  if (!txId) {
    return { status: "error", error: "Transaction ID is required" };
  }
  if (currency !== "HIVE" && currency !== "HBD") {
    return { status: "error", error: "Only HIVE and HBD are supported" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", error: "Invalid donation amount" };
  }

  const duplicate = await findDonationByTx(txId);
  if (duplicate) {
    return { status: "already_recorded" };
  }

  let prices;
  try {
    prices = await fetchSplPrices();
  } catch {
    return {
      status: "error",
      error: "Could not fetch token prices. Please try again.",
    };
  }

  const usdPrice = (currency === "HIVE" ? prices.hive : prices.hbd) ?? Number.NaN;
  if (!Number.isFinite(usdPrice) || usdPrice <= 0) {
    return {
      status: "error",
      error: `No valid USD price available for ${currency}`,
    };
  }

  const usdValue = amount * usdPrice;

  try {
    const created = await prisma.supportDonation.create({
      data: {
        date: new Date(),
        username: auth.username.toLowerCase(),
        currency,
        amount: toDbDecimal(amount),
        usdValue: toDbDecimal(usdValue),
        tx: txId,
      },
    });
    return { status: "success", donationId: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique") || message.includes("duplicate")) {
      return { status: "already_recorded" };
    }
    logger.error("[support] failed to insert HIVE/HBD donation", {
      error: message,
      txId,
    });
    return { status: "error", error: "Failed to save donation" };
  }
}
