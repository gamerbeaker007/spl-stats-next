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
