import prisma from "@/lib/prisma";

export async function upsertSplAccount(
  username: string,
  encryptedToken: string,
  iv: string,
  authTag: string
) {
  const now = new Date();
  return prisma.splAccount.upsert({
    where: { username },
    create: { username, encryptedToken, iv, authTag, tokenStatus: "valid", tokenVerifiedAt: now },
    update: { encryptedToken, iv, authTag, tokenStatus: "valid", tokenVerifiedAt: now },
  });
}

export async function updateSplAccountStatus(id: string, status: "valid" | "invalid" | "unknown") {
  return prisma.splAccount.update({
    where: { id },
    data: { tokenStatus: status, tokenVerifiedAt: new Date() },
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
