import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import logger from "@/lib/backend/log/logger.server";
import { tokenIcon } from "@/lib/backend/services/hive-blog-icons";
import type { HiveBlogEarningsDetailRow } from "@/types/hive-blog";

const EARNINGS_LABELS: Record<string, Record<string, string>> = {
  DEC: {
    tournament_prize: "DEC tournament prize",
    modern_leaderboard_prizes: "DEC modern leaderboard",
    leaderboard_prizes: "DEC wild leaderboard",
    rental_payment: "DEC rental payments",
    rental_payment_fees: "DEC rental fees",
    enter_tournament: "DEC tournament entry fee",
    market_rental: "DEC market rental",
    purchased_energy: "DEC purchased energy",
    market_fees: "DEC market fees",
    market_list_fee: "DEC market list fee",
    market_burn_fees: "DEC market burn fees",
    market_purchase: "DEC market (buy/sell)",
    purchase_wild_pass: "DEC wild pass purchase",
    swap_tokens: "DEC swap token",
    swap_tokens_burn_fee: "DEC swap token burn fee",
    swap_tokens_fee: "DEC swap token fee",
    purchase_ranked_draw_pass: "DEC fortune ranked draw pass purchase",
  },
  SPS: {
    tournament_prize: "SPS tournament prize",
    token_transfer_multi: "SPS tournament (multi-token)",
    claim_staking_rewards: "SPS staking reward",
    claim_staking_rewards_staking_rewards: "SPS staking reward",
    claim_staking_rewards_validator_rewards: "SPS validator reward",
    validate_block: "SPS block validation",
    enter_tournament: "SPS tournament entry fee",
    delegation_modern: "SPS ranked (modern) fee",
    delegation_wild: "SPS ranked (wild) fee",
    delegation_season: "SPS season fee",
    delegation_land: "SPS land fee",
    delegation_brawl: "SPS brawl delegation",
    token_transfer: "SPS token transfer",
    stake_tokens: "SPS stake tokens",
    stake_tokens_multi: "SPS stake tokens (multi-token)",
  },
  SPSP: {
    stake_tokens: "SPSP stake tokens",
    stake_tokens_multi: "SPSP stake tokens (multi-token)",
  },
  "SPSP-OUT": {
    delegate_tokens: "SPSP token delegation out",
  },
  "SPSP-IN": {
    delegate_tokens: "SPSP token delegation in",
  },
  UNCLAIMED_SPS: {
    modern: "SPS ranked battle (modern)",
    wild: "SPS ranked battle (wild)",
    survival: "SPS survival battle",
    survival_bracket: "SPS survival bracket",
    season: "SPS season reward",
    land: "SPS land reward",
    brawl: "SPS brawl reward",
    "brawl_to*": "SPS brawl reward delegation",
    "survival_bracket_to*": "SPS survival bracket reward delegation",
  },
  MERITS: {
    brawl_prize: "Merits brawl prize",
    draw_rewards: "Merits draw rewards",
    guild_gladius_purchase: "Merits guild gladius purchase",
    purchase_reward_merits: "Merits from purchased rewards",
  },
  VOUCHER: {
    claim_staking_rewards_staking_rewards: "Voucher staking rewards",
    claim_staking_rewards_validator_rewards: "Voucher staking rewards validator",
    purchase_card: "Voucher card purchase",
  },
  GLINT: {
    ranked_rewards: "Glint ranked reward",
    season_rewards: "Glint season reward",
    purchase_reward_draw: "Glint reward draw spend",
    purchase_reward_merits: "Glint merits purchase",
    purchase_potion: "Glint potion purchase",
    skin_purchase: "Glint skin purchase",
    SPLINTERVIBE_craft: "SplinterVibe craft",
    "background*": "Background purchase",
    "hat*": "Hat purchase",
    "outfit*": "Outfit purchase",
  },
  CREDITS: {
    market_purchase: "Credits market",
  },
};

export function lookupEarningsLabel(token: string, type: string): string | undefined {
  const tokenLabels = EARNINGS_LABELS[token];
  if (!tokenLabels) return undefined;
  if (tokenLabels[type]) return tokenLabels[type];
  for (const [pattern, label] of Object.entries(tokenLabels)) {
    if (pattern.endsWith("*") && type.startsWith(pattern.slice(0, -1))) return label;
  }
  return undefined;
}

export function buildDetailedEarnings(
  username: string,
  rows: Awaited<ReturnType<typeof getSeasonBalances>>
): {
  earned: HiveBlogEarningsDetailRow[];
  costs: HiveBlogEarningsDetailRow[];
  unlabeledByToken: Record<string, { earnTotal: number; costTotal: number }>;
} {
  const map = new Map<string, { token: string; type: string; amount: number }>();
  for (const row of rows) {
    const key = `${row.token}:${row.type}`;
    if (!map.has(key)) map.set(key, { token: row.token, type: row.type, amount: 0 });
    map.get(key)!.amount += row.amount;
  }

  const earned: HiveBlogEarningsDetailRow[] = [];
  const costs: HiveBlogEarningsDetailRow[] = [];
  const unlabeledByToken: Record<string, { earnTotal: number; costTotal: number }> = {};

  for (const { token, type, amount } of map.values()) {
    if (amount === 0) continue;
    const labelEntry = lookupEarningsLabel(token, type);
    if (!labelEntry) {
      logger.warn(
        `[hive-blog] unlabeled earnings row - ${username} — token=${token} type=${type} amount=${amount}`
      );
      if (!unlabeledByToken[token]) unlabeledByToken[token] = { earnTotal: 0, costTotal: 0 };
      if (amount > 0) unlabeledByToken[token].earnTotal += amount;
      else unlabeledByToken[token].costTotal += Math.abs(amount);
      continue;
    }
    const icon = tokenIcon(token);
    if (amount > 0) earned.push({ token, label: labelEntry, icon, amount, isEarned: true });
    else costs.push({ token, label: labelEntry, icon, amount: Math.abs(amount), isEarned: false });
  }

  earned.sort((a, b) => b.amount - a.amount);
  costs.sort((a, b) => b.amount - a.amount);
  return { earned, costs, unlabeledByToken };
}
