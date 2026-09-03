import { Client } from "@hiveio/dhive";
import logger from "@/lib/backend/log/logger.server";

const HIVE_NODES = ["https://api.hive.blog", "https://api.hivekings.com", "https://rpc.ausbit.dev"];

export interface HiveAccountBalances {
  hive: number;
  hbd: number;
}

export async function fetchHiveAccountBalances(username: string): Promise<HiveAccountBalances> {
  const client = new Client(HIVE_NODES);
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
