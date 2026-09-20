"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { getUserPreferences, upsertUserPreferences } from "@/lib/backend/db/user-preferences";
import logger from "@/lib/backend/log/logger.server";
import { rethrowFrameworkErrors } from "@/lib/backend/next-errors";
import {
  getDefaultCategories,
  type MultiAccountDashboardCategories,
} from "@/lib/shared/dashboard-categories";

export async function getDashboardConfigAction(): Promise<MultiAccountDashboardCategories> {
  try {
    const user = await getCurrentUser();
    if (!user) return getDefaultCategories();
    const prefs = await getUserPreferences(user.id);
    return prefs?.multiAccountDashboard?.categories ?? getDefaultCategories();
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`getDashboardConfigAction error: ${error}`);
    return getDefaultCategories();
  }
}

export async function saveDashboardConfigAction(
  categories: MultiAccountDashboardCategories
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const existing = (await getUserPreferences(user.id)) ?? {};
    await upsertUserPreferences(user.id, {
      ...existing,
      multiAccountDashboard: { categories },
    });
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`saveDashboardConfigAction error: ${error}`);
  }
}
