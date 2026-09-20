import prisma from "@/lib/prisma";
import type { UserPreferences } from "@/types/dashboard/dashboardConfig";

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  if (!user?.preferences) return null;
  return user.preferences as UserPreferences;
}

export async function upsertUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: preferences as object },
  });
}
