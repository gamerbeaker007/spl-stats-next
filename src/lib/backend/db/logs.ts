import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type LogLevel = "info" | "warn" | "error";

export async function createLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  return prisma.log.create({
    data: {
      level,
      message,
      meta: meta ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function pruneLogs(olderThanDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  return prisma.log.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
