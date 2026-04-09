// Re-export the token types from balance.ts for backward compatibility
export type {
  BalanceHistoryTokenType,
  SplBalanceHistoryItem,
  SplUnclaimedBalanceHistoryItem,
} from "@/types/spl/balance";

/** Aggregated summary for one token within a season. */
export interface TokenBalanceSummary {
  token: string;
  totalEarned: number;
  totalSpent: number;
  net: number;
  byType: Record<string, { earned: number; spent: number; count: number }>;
}

/** All token summaries for a single season, as shown in BalanceHistorySection. */
export interface SeasonBalanceHistory {
  seasonId: number;
  summaries: TokenBalanceSummary[];
}
