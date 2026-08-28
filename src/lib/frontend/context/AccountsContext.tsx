"use client";

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "accounts-state-v1";

type StoredAccountsState = {
  savedAccounts: string[];
  selectedAccount: string;
  collectionSelectedAccounts: string[];
};

/** SPL token state per monitored account, as stored in the DB. */
export type MonitoredAccountToken = {
  tokenStatus: "valid" | "invalid" | "unknown";
  jwtExpiresAt: Date | null;
};

type AccountsContextType = {
  monitoredAccounts: string[];
  /** Keyed by lowercase username. Empty until the monitored accounts load. */
  monitoredAccountTokens: Record<string, MonitoredAccountToken>;
  savedAccounts: string[];
  accountOptions: string[];
  selectedAccount: string;
  collectionSelectedAccounts: string[];
  setSelectedAccount: (account: string) => void;
  setCollectionSelectedAccounts: (accounts: string[]) => void;
  addLocalAccount: (account: string) => void;
  removeLocalAccount: (account: string) => void;
  refreshMonitoredAccounts: () => Promise<void>;
};

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

function normalizeAccount(account: string | undefined): string {
  return account?.trim().toLowerCase() ?? "";
}

function normalizeAccounts(accounts: string[] | undefined): string[] {
  if (!Array.isArray(accounts)) return [];
  return Array.from(new Set(accounts.map((account) => normalizeAccount(account)).filter(Boolean)));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function readStoredState(): StoredAccountsState {
  if (typeof window === "undefined") {
    return {
      savedAccounts: [],
      selectedAccount: "",
      collectionSelectedAccounts: [],
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      savedAccounts: [],
      selectedAccount: "",
      collectionSelectedAccounts: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      savedAccounts?: string[];
      selectedAccount?: string;
      collectionSelectedAccounts?: string[];
    };

    return {
      savedAccounts: normalizeAccounts(parsed.savedAccounts),
      selectedAccount: normalizeAccount(parsed.selectedAccount),
      collectionSelectedAccounts: normalizeAccounts(parsed.collectionSelectedAccounts),
    };
  } catch {
    return {
      savedAccounts: [],
      selectedAccount: "",
      collectionSelectedAccounts: [],
    };
  }
}

export function AccountsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user, reAuthVersion, tokenStatusVersion } = useAuth();

  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccountState] = useState("");
  const [collectionSelectedAccounts, setCollectionSelectedAccountsState] = useState<string[]>([]);
  const [monitoredAccounts, setMonitoredAccounts] = useState<string[]>([]);
  const [monitoredAccountTokens, setMonitoredAccountTokens] = useState<
    Record<string, MonitoredAccountToken>
  >({});

  const loggedInAccount = normalizeAccount(user?.username);

  useEffect(() => {
    // Hydrate from localStorage after mount — reading it during render would
    // cause an SSR/client hydration mismatch, so the sync must live in an effect.
    const stored = readStoredState();

    setSavedAccounts(stored.savedAccounts);
    setSelectedAccountState(stored.selectedAccount);
    setCollectionSelectedAccountsState(stored.collectionSelectedAccounts);
  }, []);

  const refreshMonitoredAccounts = useCallback(async () => {
    if (!loggedInAccount) {
      setMonitoredAccounts([]);
      setMonitoredAccountTokens({});
      return;
    }

    const rows = await getMonitoredAccounts();
    setMonitoredAccounts(normalizeAccounts(rows.map((entry) => entry.username)));
    // The same rows already carry the SPL token state, so publishing it here
    // costs no extra round trip and replaces the per-card `getAccountTokenStatus`
    // call that every `AuthenticationStatus` used to make.
    setMonitoredAccountTokens(
      Object.fromEntries(
        rows.map((entry) => [
          normalizeAccount(entry.username),
          {
            tokenStatus: (entry.splAccount?.tokenStatus ?? "unknown") as
              | "valid"
              | "invalid"
              | "unknown",
            jwtExpiresAt: entry.splAccount?.jwtExpiresAt ?? null,
          },
        ])
      )
    );
    // `reAuthVersion` / `tokenStatusVersion` are intentional "refetch triggers":
    // they are not read in the body, but bumping either must re-read the token
    // state so the dashboard reflects a fresh JWT without a page reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInAccount, reAuthVersion, tokenStatusVersion]);

  useEffect(() => {
    // Loads server-side monitored accounts (and clears them on logout) — an
    // external-data sync that necessarily updates state from within the effect.

    refreshMonitoredAccounts();
  }, [refreshMonitoredAccounts]);

  useEffect(() => {
    // If an account is now monitored, it is no longer considered a removable local account.

    setSavedAccounts((current) => {
      const filtered = current.filter((account) => !monitoredAccounts.includes(account));
      return arraysEqual(filtered, current) ? current : filtered;
    });
  }, [monitoredAccounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const stored = readStoredState();
      setSavedAccounts(stored.savedAccounts);
      setSelectedAccountState(stored.selectedAccount);
      setCollectionSelectedAccountsState(stored.collectionSelectedAccounts);
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const accountOptions = useMemo(
    () => normalizeAccounts([...monitoredAccounts, ...savedAccounts, loggedInAccount]),
    [loggedInAccount, monitoredAccounts, savedAccounts]
  );

  useEffect(() => {
    // Reconcile the persisted selection against the currently valid account
    // options (which arrive asynchronously). Both writes are guarded by an
    // equality check so this converges rather than looping.
    const safeSelected =
      selectedAccount && accountOptions.includes(selectedAccount)
        ? selectedAccount
        : loggedInAccount && accountOptions.includes(loggedInAccount)
          ? loggedInAccount
          : (accountOptions[0] ?? "");

    const safeCollection = normalizeAccounts(
      collectionSelectedAccounts.filter((account) => accountOptions.includes(account))
    );

    const nextCollection =
      safeCollection.length > 0 ? safeCollection : safeSelected ? [safeSelected] : [];

    if (safeSelected !== selectedAccount) {
      setSelectedAccountState(safeSelected);
    }

    if (!arraysEqual(nextCollection, collectionSelectedAccounts)) {
      setCollectionSelectedAccountsState(nextCollection);
    }
  }, [
    accountOptions,
    collectionSelectedAccounts,
    loggedInAccount,
    selectedAccount,
    setCollectionSelectedAccountsState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextState: StoredAccountsState = {
      savedAccounts,
      selectedAccount,
      collectionSelectedAccounts,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [collectionSelectedAccounts, savedAccounts, selectedAccount]);

  const setSelectedAccount = useCallback(
    (account: string) => {
      const normalized = normalizeAccount(account);
      if (!normalized) return;
      setSelectedAccountState(normalized);
      setCollectionSelectedAccountsState((current) => {
        if (current.includes(normalized)) return current;
        return [normalized, ...current].slice(0, 8);
      });
    },
    [setCollectionSelectedAccountsState]
  );

  const setCollectionSelectedAccounts = useCallback(
    (accounts: string[]) => {
      const normalized = normalizeAccounts(accounts).filter((account) =>
        accountOptions.includes(account)
      );
      setCollectionSelectedAccountsState(normalized);
      if (normalized[0]) {
        setSelectedAccountState(normalized[0]);
      }
    },
    [accountOptions]
  );

  const addLocalAccount = useCallback((account: string) => {
    const normalized = normalizeAccount(account);
    if (!normalized) return;

    setSavedAccounts((current) => normalizeAccounts([...current, normalized]));
    setSelectedAccountState(normalized);
    setCollectionSelectedAccountsState((current) => {
      if (current.includes(normalized)) return current;
      return [normalized, ...current];
    });
  }, []);

  const removeLocalAccount = useCallback(
    (account: string) => {
      const normalized = normalizeAccount(account);
      if (!normalized || monitoredAccounts.includes(normalized)) return;

      setSavedAccounts((current) => current.filter((entry) => entry !== normalized));
      setCollectionSelectedAccountsState((current) =>
        current.filter((entry) => entry !== normalized)
      );

      setSelectedAccountState((current) => (current === normalized ? "" : current));
    },
    [monitoredAccounts]
  );

  const value = useMemo<AccountsContextType>(
    () => ({
      monitoredAccounts,
      monitoredAccountTokens,
      savedAccounts,
      accountOptions,
      selectedAccount,
      collectionSelectedAccounts,
      setSelectedAccount,
      setCollectionSelectedAccounts,
      addLocalAccount,
      removeLocalAccount,
      refreshMonitoredAccounts,
    }),
    [
      accountOptions,
      addLocalAccount,
      collectionSelectedAccounts,
      monitoredAccounts,
      monitoredAccountTokens,
      refreshMonitoredAccounts,
      removeLocalAccount,
      savedAccounts,
      selectedAccount,
      setCollectionSelectedAccounts,
      setSelectedAccount,
    ]
  );

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within AccountsProvider");
  }
  return context;
}
