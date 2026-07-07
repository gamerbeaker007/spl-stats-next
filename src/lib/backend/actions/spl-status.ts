"use server";

import { getCachedSplMaintenanceSettings } from "@/lib/backend/cache/spl-cache";

async function cachedMaintenanceStatus(): Promise<{ maintenance: boolean }> {
  try {
    const settings = await getCachedSplMaintenanceSettings();
    return { maintenance: settings.maintenance_mode ?? false };
  } catch {
    // If SPL is unreachable, treat it as in maintenance
    return { maintenance: true };
  }
}

/** Returns whether Splinterlands is currently in maintenance mode. Cached for 60 s. */
export async function getSplMaintenanceStatus(): Promise<{ maintenance: boolean }> {
  return cachedMaintenanceStatus();
}
