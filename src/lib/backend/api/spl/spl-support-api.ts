import logger from "@/lib/backend/log/logger.server";
import { fetchTransactionLookup } from "@/lib/backend/api/spl/spl-api";

export interface RawTokenTransferTrxInfo {
  id: string;
  type: string;
  player: string;
  data: string;
  result: string | null;
  success?: boolean;
  failed?: boolean;
  error?: string | null;
  created_date?: string;
}

export interface VerifiedTokenTransfer {
  from: string;
  to: string;
  token: string;
  amount: number;
  date: Date;
  trxId: string;
}

export type TokenTransferVerifyResult =
  | { ok: true; data: VerifiedTokenTransfer }
  | { ok: false; pending: true }
  | { ok: false; pending: false; error: string };

interface ParsedResult {
  success?: boolean;
  from?: string;
  to?: string;
  amount?: number;
  token?: string;
  trx_id?: string;
  created_date?: string;
}

export async function fetchRawTokenTransfer(
  trxId: string
): Promise<RawTokenTransferTrxInfo | null> {
  const raw = await fetchTransactionLookup(trxId);
  if (!raw?.trx_info) {
    return null;
  }
  return raw.trx_info as RawTokenTransferTrxInfo;
}

export function parseTokenTransferTrxInfo(
  trxInfo: RawTokenTransferTrxInfo
): TokenTransferVerifyResult {
  if (trxInfo.success === false || trxInfo.failed === true) {
    return {
      ok: false,
      pending: false,
      error: trxInfo.error ?? "Transaction failed on-chain",
    };
  }

  if (trxInfo.type !== "token_transfer") {
    return {
      ok: false,
      pending: false,
      error: `Unexpected transaction type: ${trxInfo.type}`,
    };
  }

  if (!trxInfo.result) {
    return { ok: false, pending: true };
  }

  let resultObj: ParsedResult;
  try {
    resultObj = JSON.parse(trxInfo.result) as ParsedResult;
  } catch {
    return {
      ok: false,
      pending: false,
      error: "Could not parse transaction result",
    };
  }

  if (resultObj.success === false) {
    return {
      ok: false,
      pending: false,
      error: "Transaction result indicates failure",
    };
  }

  const amount = Number(resultObj.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, pending: false, error: "Invalid transaction amount" };
  }

  const from = (resultObj.from ?? trxInfo.player ?? "").toLowerCase();
  const to = (resultObj.to ?? "").toLowerCase();
  const token = String(resultObj.token ?? "").toUpperCase();

  if (!from || !to || !token) {
    return {
      ok: false,
      pending: false,
      error: "Transaction data missing sender, recipient, or token",
    };
  }

  if (resultObj.trx_id && resultObj.trx_id !== trxInfo.id) {
    return { ok: false, pending: false, error: "Transaction ID mismatch" };
  }

  const date = resultObj.created_date
    ? new Date(resultObj.created_date)
    : trxInfo.created_date
      ? new Date(trxInfo.created_date)
      : new Date();

  logger.info(`Parsed token transfer ${trxInfo.id}: ${from} -> ${to} ${amount} ${token}`);

  return {
    ok: true,
    data: {
      from,
      to,
      token,
      amount,
      date,
      trxId: trxInfo.id,
    },
  };
}
