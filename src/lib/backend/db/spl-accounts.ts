import prisma from "@/lib/prisma";

export async function upsertSplAccount(
  username: string,
  encryptedToken: string,
  iv: string,
  authTag: string
) {
  return prisma.splAccount.upsert({
    where: { username },
    create: { username, encryptedToken, iv, authTag },
    update: { encryptedToken, iv, authTag },
  });
}

export async function findSplAccountByUsername(username: string) {
  return prisma.splAccount.findUnique({ where: { username } });
}

export async function getSplAccountCredentials(username: string) {
  return prisma.splAccount.findUnique({
    where: { username },
    select: { encryptedToken: true, iv: true, authTag: true },
  });
}

export async function deleteSplAccount(id: string) {
  return prisma.splAccount.delete({ where: { id } });
}
