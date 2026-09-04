import logger from "@/lib/backend/log/logger.server";
import { Client } from "@hiveio/dhive";

const HIVE_NODES = ["https://api.hive.blog", "https://api.hivekings.com", "https://rpc.ausbit.dev"];

// dhive rotates to the next node on failure, so one shared client is enough.
const client = new Client(HIVE_NODES);

export interface HiveAccountBalances {
  hive: number;
  hbd: number;
}

export async function fetchHiveAccountBalances(username: string): Promise<HiveAccountBalances> {
  logger.info(`Fetching Hive balances for ${username}`);
  const accounts = await client.database.getAccounts([username.toLowerCase()]);
  if (!accounts || accounts.length === 0) {
    throw new Error(`Hive account not found: ${username}`);
  }
  const account = accounts[0];
  const hive = Number.parseFloat(String(account.balance).split(" ")[0] ?? "0") || 0;
  const hbd = Number.parseFloat(String(account.hbd_balance).split(" ")[0] ?? "0") || 0;
  return { hive, hbd };
}

export interface HiveTransfer {
  from: string;
  to: string;
  amount: number;
  currency: "HIVE" | "HBD";
}

interface RawTransferOp {
  from?: string;
  to?: string;
  /** Always "<amount> <symbol>", e.g. "1.000 HIVE". */
  amount?: string;
}

/**
 * Reads a `transfer` operation back off the Hive chain by transaction id.
 *
 * A HIVE/HBD donation is a native Hive transfer: it never reaches the SPL
 * engine, so `fetchTransactionLookup` will never find it. This is the equivalent
 * authoritative source, and it is what makes the recorded amount server-verified
 * instead of whatever the browser claimed it sent.
 *
 * Returns null while the transaction is not retrievable yet (the block still has
 * to be applied) or when it carries no HIVE/HBD transfer at all — callers poll on
 * null and treat a persistent null as "not confirmed".
 */
export async function fetchHiveTransfer(trxId: string): Promise<HiveTransfer | null> {
  let tx: unknown;
  try {
    tx = await client.call("condenser_api", "get_transaction", [trxId]);
  } catch (error) {
    logger.warn(`[hive] get_transaction failed for ${trxId}: ${error}`);
    return null;
  }

  const operations = (tx as { operations?: [string, RawTransferOp][] })?.operations;
  if (!Array.isArray(operations)) return null;

  const transfer = operations.find(([op]) => op === "transfer")?.[1];
  if (!transfer?.from || !transfer.to || !transfer.amount) return null;

  const [rawAmount, currency] = String(transfer.amount).split(" ");
  if (currency !== "HIVE" && currency !== "HBD") return null;

  const amount = Number.parseFloat(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { from: transfer.from.toLowerCase(), to: transfer.to.toLowerCase(), amount, currency };
}
