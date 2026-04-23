import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { tokenIcon } from "@/lib/backend/services/hive-blog-icons";
import type { HiveBlogEarningsDetailRow } from "@/types/hive-blog";

type EarningsEntry = { label?: string; hideFromReport: true } | { label: string };

/**
 * Sparse override map. Only needed when:
 *  - a type should be hidden from the report (hideFromReport: true), or
 *  - the auto-generated label (split on _ + Title Case) would be unclear.
 * Everything else is labelled automatically.
 */
const EARNINGS_LABELS: Record<string, Record<string, EarningsEntry>> = {
  DEC: {
    swap_tokens: { hideFromReport: true },
  },
  SPS: {
    claim_staking_rewards: { label: "Staking Rewards" },
    claim_staking_rewards_staking_rewards: { label: "Staking Rewards" },
    claim_staking_rewards_validator_rewards: { label: "Validator Rewards" },
  },
  GLINT: {
    SPLINTERVIBE_craft: { label: "SplinterVibe Craft" },
  },
  VOUCHER: {
    claim_staking_rewards_staking_rewards: { label: "Staking Rewards" },
    claim_staking_rewards_validator_rewards: { label: "Staking Rewards Validator" },
  },
};

function autoLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function lookupEarningsLabel(
  token: string,
  type: string
): { label: string; hideFromReport: boolean } {
  const tokenLabels = EARNINGS_LABELS[token];
  if (tokenLabels) {
    const exact = tokenLabels[type];
    if (exact !== undefined) {
      return {
        label: "label" in exact ? (exact.label ?? autoLabel(type)) : autoLabel(type),
        hideFromReport: "hideFromReport" in exact ? exact.hideFromReport : false,
      };
    }
    for (const [pattern, entry] of Object.entries(tokenLabels)) {
      if (pattern.endsWith("*") && type.startsWith(pattern.slice(0, -1))) {
        return {
          label: "label" in entry ? (entry.label ?? autoLabel(type)) : autoLabel(type),
          hideFromReport: "hideFromReport" in entry ? entry.hideFromReport : false,
        };
      }
    }
  }
  return { label: autoLabel(type), hideFromReport: false };
}

export function buildDetailedEarnings(rows: Awaited<ReturnType<typeof getSeasonBalances>>): {
  earned: HiveBlogEarningsDetailRow[];
  costs: HiveBlogEarningsDetailRow[];
} {
  const map = new Map<string, { token: string; type: string; earned: number; cost: number }>();
  for (const row of rows) {
    const key = `${row.token}:${row.type}`;
    if (!map.has(key)) map.set(key, { token: row.token, type: row.type, earned: 0, cost: 0 });
    const entry = map.get(key)!;
    entry.earned += row.earned;
    entry.cost += row.cost;
  }

  const earned: HiveBlogEarningsDetailRow[] = [];
  const costs: HiveBlogEarningsDetailRow[] = [];

  for (const { token, type, earned: earnAmt, cost: costAmt } of map.values()) {
    if (earnAmt === 0 && costAmt === 0) continue;
    const { label, hideFromReport } = lookupEarningsLabel(token, type);
    if (hideFromReport) continue;
    const icon = tokenIcon(token);
    if (earnAmt > 0) earned.push({ token, label, icon, amount: earnAmt, isEarned: true });
    if (costAmt > 0) costs.push({ token, label, icon, amount: costAmt, isEarned: false });
  }

  earned.sort((a, b) => b.amount - a.amount);
  costs.sort((a, b) => b.amount - a.amount);
  return { earned, costs };
}
