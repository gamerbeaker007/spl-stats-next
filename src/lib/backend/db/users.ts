import prisma from "@/lib/prisma";

export async function upsertUser(username: string) {
  return prisma.user.upsert({
    where: { username },
    create: { username },
    update: {},
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, createdAt: true },
  });
}
