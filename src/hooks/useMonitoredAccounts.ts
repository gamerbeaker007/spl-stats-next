"use client";

import {
  addMonitoredAccountWithKeychain,
  reAuthMonitoredAccount,
  removeMonitoredAccount,
  verifyMonitoredAccountToken,
} from "@/lib/backend/actions/auth-actions";
import { keychainSignBuffer } from "@/lib/frontend/keychain";
import { useEffect, useState } from "react";

interface MonitoredAccount {
  id: string;
  username: string;
  createdAt: Date;
  splAccountId: string;
  tokenStatus: "valid" | "invalid" | "unknown";
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
  reAuthAccount: (monitoredAccountId: string, username: string) => Promise<boolean>;
}

export function useMonitoredAccounts(
  initialAccounts: MonitoredAccount[]
): UseMonitoredAccountsReturn {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    initialAccounts.forEach((acc) => verifyToken(acc.id));
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

  const reAuthAccount = async (monitoredAccountId: string, username: string): Promise<boolean> => {
    clearMessages();
    addBusy(monitoredAccountId);

    try {
      const timestamp = Date.now();
      const signature = await keychainSignBuffer(username, `${username}${timestamp}`);

      const response = await reAuthMonitoredAccount(username, timestamp, signature);

      if (!response.success) {
        setError(response.error ?? "Re-authentication failed");
        return false;
      }

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === monitoredAccountId ? { ...acc, tokenStatus: "valid" } : acc))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-authentication failed");
      return false;
    } finally {
      removeBusy(monitoredAccountId);
    }
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
    reAuthAccount,
  };
}
