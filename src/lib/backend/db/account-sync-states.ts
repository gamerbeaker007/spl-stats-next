import prisma from "@/lib/prisma";

export async function getOrCreateSyncState(username: string, key: string) {
  return prisma.accountSyncState.upsert({
    where: { username_key: { username, key } },
    create: { username, key },
    update: {},
  });
}

export async function updateSyncState(
  id: string,
  data: {
    lastSeasonProcessed?: number;
    lastSyncedCreatedDate?: Date | null;
    status?: "pending" | "processing" | "completed" | "failed";
    errorMessage?: string | null;
  }
) {
  return prisma.accountSyncState.update({ where: { id }, data });
}

/** Reset interrupted or failed sync states so they get retried. */
export async function resetStaleSyncStates() {
  return prisma.accountSyncState.updateMany({
    where: { status: { in: ["processing", "failed"] } },
    data: { status: "pending", errorMessage: null },
  });
}

export async function getSyncStatesForAccount(username: string) {
  return prisma.accountSyncState.findMany({ where: { username } });
}

export async function getAllSyncStates() {
  return prisma.accountSyncState.findMany({
    orderBy: [{ username: "asc" }, { key: "asc" }],
  });
}

export async function getSyncStatesForUsernames(usernames: string[]) {
  return prisma.accountSyncState.findMany({
    where: { username: { in: usernames } },
  });
}

export async function deleteSyncStatesByUsername(username: string) {
  return prisma.accountSyncState.deleteMany({ where: { username } });
}
