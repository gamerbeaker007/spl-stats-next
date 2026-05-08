"use client";

import { useReAuth } from "@/hooks/useReAuth";
import {
  addMonitoredAccountWithKeychain,
  checkRemoveScopeAction,
  removeMonitoredAccount,
  verifyMonitoredAccountToken,
} from "@/lib/backend/actions/auth-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { keychainSignBuffer } from "@/lib/frontend/keychain";
import { useEffect, useState } from "react";

interface MonitoredAccount {
  id: string;
  username: string;
  createdAt: Date;
  splAccountId: string;
  tokenStatus: "valid" | "invalid" | "unknown";
  syncStatus: "pending" | "processing" | "failed" | "completed";
  jwtExpiresAt: Date | null;
}

interface UseMonitoredAccountsReturn {
  accounts: MonitoredAccount[];
  adding: boolean;
  busyIds: string[];
  error: string | null;
  info: string | null;
  clearMessages: () => void;
  addAccount: (username: string) => Promise<boolean>;
  removeAccount: (accountId: string) => Promise<void>;
  checkRemoveScope: (accountId: string) => Promise<boolean>;
  reAuthAccount: (monitoredAccountId: string, username: string) => Promise<boolean>;
  reAuthAll: () => Promise<{ succeeded: number; failed: number }>;
}

export function useMonitoredAccounts(
  initialAccounts: MonitoredAccount[]
): UseMonitoredAccountsReturn {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { reAuth } = useReAuth();
  const { notifyTokenVerified } = useAuth();

  const clearMessages = () => {
    setError(null);
    setInfo(null);
  };

  const addBusy = (id: string) => setBusyIds((prev) => [...prev, id]);
  const removeBusy = (id: string) => setBusyIds((prev) => prev.filter((x) => x !== id));

  const verifyToken = async (monitoredAccountId: string): Promise<void> => {
    addBusy(monitoredAccountId);
    try {
      const response = await verifyMonitoredAccountToken(monitoredAccountId);
      if (response.success) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === monitoredAccountId ? { ...acc, tokenStatus: response.status! } : acc
          )
        );
      }
    } finally {
      removeBusy(monitoredAccountId);
    }
  };

  // Auto-verify all accounts on page load
  useEffect(() => {
    if (initialAccounts.length === 0) return;
    Promise.all(initialAccounts.map((acc) => verifyToken(acc.id))).then(() => {
      notifyTokenVerified();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAccount = async (username: string): Promise<boolean> => {
    const lc = username.trim().toLowerCase();
    clearMessages();
    setAdding(true);

    try {
      const timestamp = Date.now();
      const signature = await keychainSignBuffer(lc, `${lc}${timestamp}`);

      const response = await addMonitoredAccountWithKeychain(lc, timestamp, signature);

      if (!response.success) {
        if ("alreadyMonitoring" in response && response.alreadyMonitoring) {
          setInfo(`'${lc}' is already in your monitored list.`);
        } else {
          setError(response.error ?? "Failed to add account");
        }
        return false;
      }

      setAccounts((prev) => [
        ...prev,
        {
          id: response.accountId!,
          username: lc,
          createdAt: new Date(),
          splAccountId: "",
          tokenStatus: "valid",
          syncStatus: "pending",
          jwtExpiresAt: response.jwtExpiresAt ?? null,
        },
      ]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return false;
    } finally {
      setAdding(false);
    }
  };

  const removeAccount = async (accountId: string): Promise<void> => {
    try {
      const response = await removeMonitoredAccount(accountId);
      if (response.success) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      } else {
        setError(response.error ?? "Failed to remove account");
      }
    } catch {
      setError("Failed to remove account");
    }
  };

  const checkRemoveScope = async (accountId: string): Promise<boolean> => {
    const { isLastUser } = await checkRemoveScopeAction(accountId);
    return isLastUser;
  };

  const reAuthAccount = async (monitoredAccountId: string, username: string): Promise<boolean> => {
    clearMessages();
    addBusy(monitoredAccountId);
    try {
      const result = await reAuth(username);
      if (!result.success) {
        setError(result.error);
        return false;
      }
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === monitoredAccountId
            ? {
                ...acc,
                tokenStatus: "valid",
                syncStatus: "pending",
                jwtExpiresAt: result.jwtExpiresAt,
              }
            : acc
        )
      );
      return true;
    } finally {
      removeBusy(monitoredAccountId);
    }
  };

  const reAuthAll = async (): Promise<{ succeeded: number; failed: number }> => {
    let succeeded = 0;
    let failed = 0;
    for (const acc of accounts) {
      const ok = await reAuthAccount(acc.id, acc.username);
      if (ok) succeeded++;
      else failed++;
    }
    return { succeeded, failed };
  };

  return {
    accounts,
    adding,
    busyIds,
    error,
    info,
    clearMessages,
    addAccount,
    removeAccount,
    checkRemoveScope,
    reAuthAccount,
    reAuthAll,
  };
}
