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

export async function getSeasonBalances(username: string, seasonId?: number) {
  return prisma.seasonBalance.findMany({
    where: { username, ...(seasonId !== undefined ? { seasonId } : {}) },
    orderBy: [{ seasonId: "asc" }, { token: "asc" }, { type: "asc" }],
  });
}

export async function deleteSeasonBalancesByUsername(username: string) {
  return prisma.seasonBalance.deleteMany({ where: { username } });
}
