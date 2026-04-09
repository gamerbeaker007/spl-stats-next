"use server";

import { fetchSettings } from "@/lib/backend/api/spl/spl-api";
import { cacheLife, cacheTag } from "next/cache";

async function cachedMaintenanceStatus() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 60, expire: 300 });
  cacheTag("spl-maintenance");
  try {
    const settings = await fetchSettings();
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
