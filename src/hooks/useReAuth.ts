"use client";

import { reAuthMonitoredAccount } from "@/lib/backend/actions/auth-actions";
import { keychainSignBuffer } from "@/lib/frontend/keychain";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { useCallback, useState } from "react";

type ReAuthResult = { success: true } | { success: false; error: string };

export function useReAuth() {
  const [loading, setLoading] = useState(false);
  const { notifyReAuth } = useAuth();

  const reAuth = useCallback(
    async (username: string): Promise<ReAuthResult> => {
      setLoading(true);
      try {
        const lc = username.toLowerCase();
        const timestamp = Date.now();
        const signature = await keychainSignBuffer(username, `${lc}${timestamp}`);
        const result = await reAuthMonitoredAccount(username, timestamp, signature);
        if (!result.success) {
          return { success: false, error: result.error ?? "Re-authentication failed" };
        }
        notifyReAuth();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Re-authentication failed",
        };
      } finally {
        setLoading(false);
      }
    },
    [notifyReAuth]
  );

  return { reAuth, loading };
}
