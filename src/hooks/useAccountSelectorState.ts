"use client";

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

interface UseAccountSelectorStateOptions {
  storageKey: string;
  loggedInUsername?: string;
}

type StoredAccountSelectorState = {
  selectedAccount: string;
  savedAccounts: string[];
};

const ACCOUNT_SELECTOR_STORAGE_EVENT = "account-selector-storage";

function normalizeAccount(account: string | undefined): string {
  return account?.trim().toLowerCase() ?? "";
}

function readStoredState(raw: string | null): StoredAccountSelectorState {
  if (!raw) return { selectedAccount: "", savedAccounts: [] };

  try {
    const parsed = JSON.parse(raw) as {
      selectedAccount?: string;
      savedAccounts?: string[];
    };

    return {
      selectedAccount: normalizeAccount(parsed.selectedAccount),
      savedAccounts: Array.isArray(parsed.savedAccounts)
        ? parsed.savedAccounts.map(normalizeAccount).filter(Boolean)
        : [],
    };
  } catch {
    return { selectedAccount: "", savedAccounts: [] };
  }
}

function readStoredRaw(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey);
}

function writeStoredState(storageKey: string, nextState: StoredAccountSelectorState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(storageKey, JSON.stringify(nextState));
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_SELECTOR_STORAGE_EVENT, {
      detail: { storageKey },
    })
  );
}

export function useAccountSelectorState({
  storageKey,
  loggedInUsername,
}: Readonly<UseAccountSelectorStateOptions>) {
  const [monitoredAccounts, setMonitoredAccounts] = useState<string[]>([]);
  const storedRaw = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        if (typeof window === "undefined") return () => {};

        const handleStorage = (event: StorageEvent) => {
          if (event.key === storageKey) onStoreChange();
        };
        const handleLocalStorage = (event: Event) => {
          const customEvent = event as CustomEvent<{ storageKey?: string }>;
          if (customEvent.detail?.storageKey === storageKey) onStoreChange();
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener(ACCOUNT_SELECTOR_STORAGE_EVENT, handleLocalStorage);

        return () => {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(ACCOUNT_SELECTOR_STORAGE_EVENT, handleLocalStorage);
        };
      },
      [storageKey]
    ),
    useCallback(() => readStoredRaw(storageKey), [storageKey]),
    () => null
  );
  const [addAccountInput, setAddAccountInput] = useState("");

  const storedState = useMemo(() => readStoredState(storedRaw), [storedRaw]);
  const savedAccounts = storedState.savedAccounts;
  const storedSelectedAccount = storedState.selectedAccount;
  const loggedInAccount = normalizeAccount(loggedInUsername);

  const accountOptions = useMemo(
    () =>
      Array.from(
        new Set([...monitoredAccounts, ...savedAccounts, loggedInAccount].filter(Boolean))
      ),
    [loggedInAccount, monitoredAccounts, savedAccounts]
  );

  const selectedAccount = useMemo(() => {
    if (storedSelectedAccount && accountOptions.includes(storedSelectedAccount)) {
      return storedSelectedAccount;
    }
    if (loggedInAccount && accountOptions.includes(loggedInAccount)) {
      return loggedInAccount;
    }
    return accountOptions[0] ?? "";
  }, [accountOptions, loggedInAccount, storedSelectedAccount]);

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

  const updateStoredState = useCallback(
    (updater: (current: StoredAccountSelectorState) => StoredAccountSelectorState) => {
      const currentState = readStoredState(readStoredRaw(storageKey));
      writeStoredState(storageKey, updater(currentState));
    },
    [storageKey]
  );

  const setSelectedAccount = useCallback(
    (account: string) => {
      updateStoredState((current) => ({
        ...current,
        selectedAccount: normalizeAccount(account),
      }));
    },
    [updateStoredState]
  );

  function addLocalAccount() {
    const normalized = addAccountInput.trim().toLowerCase();
    if (!normalized) return;

    updateStoredState((current) => ({
      selectedAccount: normalized,
      savedAccounts: Array.from(new Set([...current.savedAccounts, normalized])),
    }));
    setAddAccountInput("");
  }

  function removeLocalAccount(account: string) {
    const normalized = account.trim().toLowerCase();
    if (!normalized) return;

    if (monitoredAccounts.includes(normalized)) {
      return;
    }

    updateStoredState((current) => {
      const savedAccountsWithoutRemoved = current.savedAccounts.filter(
        (entry) => entry !== normalized
      );

      return {
        selectedAccount: current.selectedAccount === normalized ? "" : current.selectedAccount,
        savedAccounts: savedAccountsWithoutRemoved,
      };
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
