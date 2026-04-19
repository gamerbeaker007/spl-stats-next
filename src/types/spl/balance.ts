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

/** Unclaimed balance history from /players/unclaimed_balance_history */
export interface SplUnclaimedBalanceHistoryItem {
  reward_action: "earned" | "claimed";
  id: string;
  player: string;
  token: string;
  type: string;
  amount: string;
  block_num: number;
  trx_id: string;
  created_date: string;
  to_player: string;
  status: string | null;
  last_block_action_date: string | null;
  action: string;
  block_successful: boolean;
  block_result: string;
}

/** All token types for /players/balance_history endpoint (source of truth) */
export const BALANCE_HISTORY_TOKEN_TYPES = [
  "DEC",
  "DEC-B",
  "SPS",
  "SPSP",
  "SPSP-IN",
  "SPSP-OUT",
  "MERITS",
  "VOUCHER",
  "VOUCHER-G",
  "CREDITS",
  "GLINT",
] as const;

export type BalanceHistoryTokenType = (typeof BALANCE_HISTORY_TOKEN_TYPES)[number];

/** Tokens available in /players/unclaimed_balance_history endpoint (source of truth) */
export const UNCLAIMED_TOKEN_TYPES = ["SPS", "VOUCHER"] as const;

export type UnclaimedTokenType = (typeof UNCLAIMED_TOKEN_TYPES)[number];

// ---------------------------------------------------------------------------
// Spillover types — transactions that arrive after a season ends but belong to it
// ---------------------------------------------------------------------------

/** GLINT transaction types that arrive after a season ends but belong to the previous season. */
export const GLINT_SPILLOVER_TYPES = [
  "season_rewards",
  "leaderboard_prizes",
  "modern_leaderboard_prizes",
  "affiliate_season_rewards_modern",
  "affiliate_season_rewards_wild",
  "survival_leaderboard_prizes",
  "survival_bracket_rewards",
] as const;

/** Unclaimed transaction types that are season-related spillover. */
export const UNCLAIMED_SPILLOVER_TYPES = ["season"] as const;

/** Map of balance_history tokens to their spillover types (only GLINT has spillover). */
export const BALANCE_SPILLOVER_TYPES: Partial<Record<BalanceHistoryTokenType, readonly string[]>> =
  {
    GLINT: GLINT_SPILLOVER_TYPES,
  };
