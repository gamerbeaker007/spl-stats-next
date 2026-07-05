"use client";

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { useEffect, useMemo, useState } from "react";

interface UseAccountSelectorStateOptions {
  storageKey: string;
  loggedInUsername?: string;
}

export function useAccountSelectorState({
  storageKey,
  loggedInUsername,
}: Readonly<UseAccountSelectorStateOptions>) {
  const [monitoredAccounts, setMonitoredAccounts] = useState<string[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [addAccountInput, setAddAccountInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        selectedAccount?: string;
        savedAccounts?: string[];
      };
      if (typeof parsed.selectedAccount === "string") {
        setSelectedAccount(parsed.selectedAccount.toLowerCase());
      }
      if (Array.isArray(parsed.savedAccounts)) {
        setSavedAccounts(parsed.savedAccounts.map((entry) => entry.toLowerCase()));
      }
    } catch {
      // ignore local-storage parse issues
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedAccount,
        savedAccounts,
      })
    );
  }, [savedAccounts, selectedAccount, storageKey]);

  useEffect(() => {
    let active = true;

    async function loadMonitoredAccounts() {
      const rows = await getMonitoredAccounts();
      if (!active) return;

      const monitored = rows.map((entry) => entry.username.toLowerCase());
      setMonitoredAccounts(monitored);
    }

    loadMonitoredAccounts();

    return () => {
      active = false;
    };
  }, [loggedInUsername]);

  useEffect(() => {
    const normalized = loggedInUsername?.toLowerCase();
    if (!normalized) return;

    setSavedAccounts((prev) => (prev.includes(normalized) ? prev : [normalized, ...prev]));
  }, [loggedInUsername]);

  const accountOptions = useMemo(
    () => Array.from(new Set([...monitoredAccounts, ...savedAccounts])),
    [monitoredAccounts, savedAccounts]
  );

  useEffect(() => {
    if (selectedAccount && accountOptions.includes(selectedAccount)) return;

    const normalized = loggedInUsername?.toLowerCase();
    if (normalized && accountOptions.includes(normalized)) {
      setSelectedAccount(normalized);
      return;
    }

    setSelectedAccount(accountOptions[0] ?? "");
  }, [accountOptions, loggedInUsername, selectedAccount]);

  function addLocalAccount() {
    const normalized = addAccountInput.trim().toLowerCase();
    if (!normalized) return;

    setSavedAccounts((prev) => Array.from(new Set([...prev, normalized])));
    setSelectedAccount(normalized);
    setAddAccountInput("");
  }

  function removeLocalAccount(account: string) {
    const normalized = account.trim().toLowerCase();
    if (!normalized) return;

    if (monitoredAccounts.includes(normalized)) {
      return;
    }

    setSavedAccounts((prev) => prev.filter((entry) => entry !== normalized));
    setSelectedAccount((prev) => {
      if (prev !== normalized) return prev;
      const remaining = accountOptions.filter((entry) => entry !== normalized);
      return remaining[0] ?? "";
    });
  }

  return {
    monitoredAccounts,
    savedAccounts,
    selectedAccount,
    setSelectedAccount,
    addAccountInput,
    setAddAccountInput,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  };
}
