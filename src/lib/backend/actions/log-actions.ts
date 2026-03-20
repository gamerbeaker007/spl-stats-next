"use server";

import { isAdmin } from "@/lib/backend/auth/admin";
import { listLogs, type LogLevel } from "@/lib/backend/db/logs";
import { getCurrentUser } from "./auth-actions";

export type LogRow = {
  id: string;
  level: string;
  message: string;
  meta: unknown;
  createdAt: string; // ISO string — safe to pass to client
};

export async function getLogsAction(
  page = 1,
  level?: LogLevel,
  limit = 2
): Promise<
  | { success: true; logs: LogRow[]; total: number; pages: number }
  | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  const { logs, total } = await listLogs({ page, limit, level });

  return {
    success: true,
    logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total,
    pages: Math.ceil(total / limit),
  };
}
