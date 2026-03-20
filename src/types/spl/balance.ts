import { SplError } from "@/types/spl/error";

export interface SplBalanceHistoryItem {
  player: string;
  token: string;
  amount: string;
  balance_start: string;
  balance_end: string;
  block_num: number;
  trx_id: string;
  type: string;
  created_date: string;
  counterparty: string;
  last_update_date: string;
  is_archived: number;
}

export type SplBalanceHistoryResponse = SplBalanceHistoryItem[] | SplError;
