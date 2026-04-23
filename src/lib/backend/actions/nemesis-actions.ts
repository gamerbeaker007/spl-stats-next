"use server";

import { getNemesisOpponentStats } from "@/lib/backend/db/battle-cards";
import { NemesisData, NemesisOpponentStat } from "@/types/battles";
import { UnifiedCardFilter } from "@/types/card-filter";

function aggregateOpponents(rows: { opponent: string }[]): NemesisOpponentStat[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.opponent, (map.get(r.opponent) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([opponent, battles]) => ({ opponent, battles }))
    .sort((a, b) => b.battles - a.battles);
}

export async function getNemesisDataAction(filter: UnifiedCardFilter): Promise<NemesisData | null> {
  if (!filter.account) return null;

  const since =
    filter.sinceDays > 0
      ? new Date(Date.now() - filter.sinceDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  const rows = await getNemesisOpponentStats(filter.account, since);
  if (rows.length === 0) return null;

  const formatBuckets = new Map<string, typeof rows>();
  const matchTypeBuckets = new Map<string, typeof rows>();

  for (const row of rows) {
    if (!formatBuckets.has(row.format)) formatBuckets.set(row.format, []);
    formatBuckets.get(row.format)!.push(row);
    if (!matchTypeBuckets.has(row.matchType)) matchTypeBuckets.set(row.matchType, []);
    matchTypeBuckets.get(row.matchType)!.push(row);
  }

  const byFormat: Record<string, NemesisOpponentStat[]> = {};
  for (const [fmt, fRows] of formatBuckets) {
    byFormat[fmt] = aggregateOpponents(fRows);
  }

  const byMatchType: Record<string, NemesisOpponentStat[]> = {};
  for (const [mt, mRows] of matchTypeBuckets) {
    byMatchType[mt] = aggregateOpponents(mRows);
  }

  return { overall: aggregateOpponents(rows), byFormat, byMatchType };
}
