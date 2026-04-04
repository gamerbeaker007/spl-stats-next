import prisma from "@/lib/prisma";

export async function upsertSeasonBalance(
  username: string,
  seasonId: number,
  token: string,
  type: string,
  amount: number,
  count: number
) {
  return prisma.seasonBalance.upsert({
    where: { username_seasonId_token_type: { username, seasonId, token, type } },
    create: { username, seasonId, token, type, amount, count },
    update: { amount, count },
  });
}

export async function upsertSeasonBalanceBatch(
  rows: Array<{
    username: string;
    seasonId: number;
    token: string;
    type: string;
    amount: number;
    count: number;
  }>
) {
  // Use a transaction to upsert all rows for a season atomically
  return prisma.$transaction(
    rows.map((row) =>
      prisma.seasonBalance.upsert({
        where: {
          username_seasonId_token_type: {
            username: row.username,
            seasonId: row.seasonId,
            token: row.token,
            type: row.type,
          },
        },
        create: row,
        update: { amount: row.amount, count: row.count },
      })
    )
  );
}

/**
 * Increment existing season balance aggregates by the given delta amounts.
 * Creates the row if it doesn't exist yet. Safe to call repeatedly — never overwrites,
 * only adds the delta on top of whatever is already stored.
 */
export async function incrementSeasonBalanceBatch(
  rows: Array<{
    username: string;
    seasonId: number;
    token: string;
    type: string;
    amount: number;
    count: number;
  }>
) {
  return prisma.$transaction(
    rows.map((row) =>
      prisma.seasonBalance.upsert({
        where: {
          username_seasonId_token_type: {
            username: row.username,
            seasonId: row.seasonId,
            token: row.token,
            type: row.type,
          },
        },
        create: row,
        update: { amount: { increment: row.amount }, count: { increment: row.count } },
      })
    )
  );
}

export async function getSeasonBalances(username: string, seasonId?: number) {
  return prisma.seasonBalance.findMany({
    where: { username, ...(seasonId !== undefined ? { seasonId } : {}) },
    orderBy: [{ seasonId: "asc" }, { token: "asc" }, { type: "asc" }],
  });
}

export async function deleteSeasonBalancesByUsername(username: string) {
  return prisma.seasonBalance.deleteMany({ where: { username } });
}

/**
 * Return all season balances for an account grouped by (seasonId, token).
 * Each element carries an array of { type, amount } entries.
 * Ordered by seasonId asc, then token asc.
 */
export async function getSeasonBalancesByToken(
  username: string,
  token: string
): Promise<Array<{ seasonId: number; type: string; amount: number }>> {
  const rows = await prisma.seasonBalance.findMany({
    where: { username, token },
    orderBy: [{ seasonId: "asc" }, { type: "asc" }],
    select: { seasonId: true, type: true, amount: true },
  });
  return rows;
}

/**
 * Returns all distinct tokens recorded for an account.
 */
export async function getDistinctTokensForUser(username: string): Promise<string[]> {
  const rows = await prisma.seasonBalance.findMany({
    where: { username },
    distinct: ["token"],
    select: { token: true },
    orderBy: { token: "asc" },
  });
  return rows.map((r) => r.token);
}

/**
 * Earnings summary per season for a set of tokens.
 * Returns { seasonId, token, total } where total is the sum of only the
 * whitelisted transaction types (typeFilters). Pass an empty array for a
 * token to include all its types (e.g. UNCLAIMED_SPS).
 */
export async function getSeasonEarningsSummary(
  username: string,
  tokens: string[],
  typeFilters: Record<string, string[]> = {}
): Promise<Array<{ seasonId: number; token: string; total: number }>> {
  const rows = await prisma.seasonBalance.findMany({
    where: { username, token: { in: tokens } },
    orderBy: [{ seasonId: "asc" }, { token: "asc" }],
    select: { seasonId: true, token: true, type: true, amount: true },
  });

  // Group into (seasonId, token) buckets, filtering by whitelisted types
  const map = new Map<string, { seasonId: number; token: string; total: number }>();
  for (const row of rows) {
    const allowed = typeFilters[row.token];
    // If a filter list is defined and non-empty, skip types not in it
    if (allowed && allowed.length > 0 && !allowed.includes(row.type)) continue;

    const key = `${row.seasonId}:${row.token}`;
    if (!map.has(key)) map.set(key, { seasonId: row.seasonId, token: row.token, total: 0 });
    map.get(key)!.total += row.amount;
  }

  return Array.from(map.values());
}
