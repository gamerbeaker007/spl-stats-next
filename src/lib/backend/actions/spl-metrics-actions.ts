"use server";

import { fetchPlayerDetails, fetchSplMetrics } from "@/lib/backend/api/spl/spl-api";
import type { SplMetricRow } from "@/types/spl/metrics";

/**
 * Fetch all SPL metrics and flatten them into a row-per-date format.
 * Public data — no auth required.
 */
export async function getSplMetricsAction(): Promise<SplMetricRow[]> {
  const entries = await fetchSplMetrics();
  const rows: SplMetricRow[] = [];
  for (const entry of entries) {
    for (const v of entry.values) {
      rows.push({ date: v.date, metric: entry.metric, value: v.value });
    }
  }
  return rows;
}

/**
 * Fetch the join date for a single SPL username.
 * Returns null when the username does not exist.
 */
export async function getPlayerJoinDateAction(
  username: string
): Promise<{ username: string; joinDate: string | null }> {
  try {
    const details = await fetchPlayerDetails(username.toLowerCase());
    return { username, joinDate: details.join_date ?? null };
  } catch {
    return { username, joinDate: null };
  }
}
