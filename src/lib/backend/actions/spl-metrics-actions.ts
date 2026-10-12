"use server";

import { getCachedSplJoinDate, getCachedSplMetrics } from "@/lib/backend/cache/spl-cache";
import type { SplMetricRow } from "@/types/spl/metrics";

/**
 * Fetch all SPL metrics and flatten them into a row-per-date format.
 * Public data — no auth required.
 */
export async function getSplMetricsAction(): Promise<SplMetricRow[]> {
  const entries = await getCachedSplMetrics();
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
    return { username, joinDate: await getCachedSplJoinDate(username) };
  } catch {
    return { username, joinDate: null };
  }
}
