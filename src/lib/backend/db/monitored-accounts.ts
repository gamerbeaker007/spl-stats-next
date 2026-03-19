import prisma from "@/lib/prisma";

export async function findMonitoredAccount(userId: string, username: string) {
  return prisma.monitoredAccount.findUnique({
    where: { userId_username: { userId, username } },
  });
}

export async function createMonitoredAccount(
  userId: string,
  splAccountId: string,
  username: string
) {
  return prisma.monitoredAccount.create({
    data: { userId, splAccountId, username },
  });
}

export async function upsertMonitoredAccount(
  userId: string,
  splAccountId: string,
  username: string
) {
  return prisma.monitoredAccount.upsert({
    where: { userId_username: { userId, username } },
    create: { userId, splAccountId, username },
    update: {},
  });
}

export async function listMonitoredAccounts(userId: string) {
  return prisma.monitoredAccount.findMany({
    where: { userId },
    select: { id: true, username: true, createdAt: true },
    orderBy: { username: "asc" },
  });
}

export async function findMonitoredAccountById(accountId: string, userId: string) {
  return prisma.monitoredAccount.findUnique({
    where: { id: accountId, userId },
    select: { splAccountId: true },
  });
}

export async function deleteMonitoredAccount(accountId: string, userId: string) {
  return prisma.monitoredAccount.delete({
    where: { id: accountId, userId },
  });
}

export async function countMonitoredAccountsBySplAccount(splAccountId: string) {
  return prisma.monitoredAccount.count({
    where: { splAccountId },
  });
}
