import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type LogLevel = "info" | "warn" | "error";

const logToDB = process.env.LOG_DB !== "false";

export async function createLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!logToDB) return;
  console.log(`[createLog] ${level.toUpperCase()}: ${message}`, meta || "");
  return prisma.log.create({
    data: {
      level,
      message,
      meta: meta ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function listLogs(opts: { page: number; limit: number; level?: LogLevel; search?: string }) {
  const { page, limit, level, search } = opts;
  const where: Prisma.LogWhereInput = {
    ...(level ? { level } : {}),
    ...(search ? { message: { contains: search, mode: "insensitive" } } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.log.count({ where }),
  ]);
  return { logs, total };
}

export async function pruneLogs(olderThanDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  return prisma.log.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
