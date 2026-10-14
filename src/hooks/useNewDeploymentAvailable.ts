"use client";

import {
  CLIENT_DEPLOYMENT_ID,
  isNewDeployment,
  isStaleServerActionError,
  VERSION_ENDPOINT,
} from "@/lib/shared/deployment-version";
import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Detects that a newer build was deployed while this tab stayed open.
 * Checks on an interval, when the tab becomes visible again, and immediately
 * when an uncaught "Server Action not found" error surfaces.
 * Disabled when the bundle has no deployment id (dev / local builds).
 */
export function useNewDeploymentAvailable() {
  const [serverId, setServerId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(VERSION_ENDPOINT, { cache: "no-store" });
      if (!res.ok) return;
      const { deploymentId } = (await res.json()) as { deploymentId?: string };
      setServerId(deploymentId ?? null);
    } catch {
      // Offline or server restarting mid-deploy — try again next tick.
    }
  }, []);

  useEffect(() => {
    if (!CLIENT_DEPLOYMENT_ID) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleServerActionError(event.reason)) void check();
    };

    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [check]);

  const available = isNewDeployment(CLIENT_DEPLOYMENT_ID, serverId) && serverId !== dismissedId;

  return {
    available,
    reload: () => window.location.reload(),
    dismiss: () => setDismissedId(serverId),
  };
}
