import prisma from "@/lib/prisma";

export async function createWorkerRun() {
  return prisma.workerRun.create({ data: {} });
}

export async function completeWorkerRun(
  id: string,
  status: "completed" | "failed",
  accountsProcessed: number,
  error?: string
) {
  const now = new Date();
  const run = await prisma.workerRun.findUnique({ where: { id } });
  const durationMs = run ? now.getTime() - run.startedAt.getTime() : null;

  return prisma.workerRun.update({
    where: { id },
    data: { status, completedAt: now, durationMs, accountsProcessed, error },
  });
}

export async function updateWorkerRunProgress(id: string, accountsProcessed: number) {
  return prisma.workerRun.update({ where: { id }, data: { accountsProcessed } });
}

export async function getLatestWorkerRun() {
  return prisma.workerRun.findFirst({ orderBy: { startedAt: "desc" } });
}

/**
 * Mark any WorkerRun rows still in "running" status as "failed".
 * Called at worker startup to clean up records left behind by a crash.
 */
export async function markStaleWorkerRunsFailed() {
  return prisma.workerRun.updateMany({
    where: { status: "running" },
    data: { status: "failed", error: "Worker process terminated unexpectedly" },
  });
}

/**
 * Prune old WorkerRun rows, keeping only the most recent `keepCount` records.
 * Called at worker startup so the table doesn't grow unboundedly across restarts.
 */
export async function pruneOldWorkerRuns(keepCount: number) {
  const cutoffRow = await prisma.workerRun.findFirst({
    orderBy: { startedAt: "desc" },
    skip: keepCount - 1,
    select: { startedAt: true },
  });
  if (!cutoffRow) return { count: 0 };
  return prisma.workerRun.deleteMany({
    where: { startedAt: { lt: cutoffRow.startedAt } },
  });
}
