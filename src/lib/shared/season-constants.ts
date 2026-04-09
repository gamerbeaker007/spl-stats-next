/**
 * Season overview constants — shared between server and client.
 * Safe for both `"use server"` actions and client components.
 */

/** Token names used in the earnings overview chart. */
export const EARNINGS_TOKENS = ["DEC", "MERITS", "GLINT", "SPS", "UNCLAIMED_SPS"] as const;
export type EarningsToken = (typeof EARNINGS_TOKENS)[number];

/**
 * Whitelisted transaction types per token for the earnings chart.
 * Only these types are summed — matches the Python season_balance_info_page logic.
 */
export const TOKEN_TYPE_FILTERS: Record<string, string[]> = {
  DEC: [
    "reward",
    "quest_rewards",
    "season_rewards",
    "rental_payment",
    "earn_rental_payment",
    "cost_rental_payment",
    "rental_payment_fees",
    "market_rental",
    "rental_refund",
    "tournament_prize",
    "enter_tournament",
    "modern_leaderboard_prizes",
    "wild_leaderboard_prizes",
  ],
  SPS: [
    "claim_staking_rewards",
    "claim_staking_rewards_staking_rewards",
    "claim_staking_rewards_validator_rewards",
    "validate_block",
    "token_award",
    "tournament_prize",
    "token_transfer_multi",
    "enter_tournament",
  ],
  // UNCLAIMED_SPS: sum all types (no filter)
  MERITS: ["quest_rewards", "season_rewards", "brawl_prize"],
  GLINT: ["ranked_rewards", "season_rewards"],
};
