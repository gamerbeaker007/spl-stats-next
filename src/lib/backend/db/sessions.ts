import prisma from "@/lib/prisma";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  return prisma.session.create({ data: { userId, expiresAt } });
}

/** Returns the session only if it exists and has not expired. */
export async function getValidSession(id: string) {
  return prisma.session.findFirst({
    where: { id, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true, expiresAt: true },
  });
}

export async function deleteSession(id: string) {
  await prisma.session.deleteMany({ where: { id } });
}

/** Housekeeping: remove expired rows. Called on each login. */
export async function pruneExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
