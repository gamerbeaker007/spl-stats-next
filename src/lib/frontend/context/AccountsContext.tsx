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
  useSyncExternalStore,
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
  /**
   * True once the stored selection is restored and reconciled against the loaded
   * account options. Before that `selectedAccount` can still change (e.g. `""` →
   * stored account), so data loaders keyed on it should wait to avoid a wasted fetch.
   */
  accountsReady: boolean;
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

type MonitoredState = {
  /** The logged-in account the monitored list was last loaded for (`null`: not yet). */
  loadedFor: string | null;
  accounts: string[];
  /** Keyed by lowercase username. */
  tokens: Record<string, MonitoredAccountToken>;
};

const INITIAL_MONITORED_STATE: MonitoredState = { loadedFor: null, accounts: [], tokens: {} };
/** Logged out: nothing is monitored, and that is known without a fetch. */
const LOGGED_OUT_MONITORED_STATE: MonitoredState = { loadedFor: "", accounts: [], tokens: {} };

const subscribeNoop = () => () => {};

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
  const { user, loading: authLoading, reAuthVersion, tokenStatusVersion } = useAuth();

  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccountState] = useState("");
  const [collectionSelectedAccounts, setCollectionSelectedAccountsState] = useState<string[]>([]);
  const [monitored, setMonitored] = useState<MonitoredState>(INITIAL_MONITORED_STATE);
  const [hydrated, setHydrated] = useState(false);

  const loggedInAccount = normalizeAccount(user?.username);

  // `false` on the server and during hydration, `true` afterwards. Reading
  // localStorage before that would cause an SSR/client hydration mismatch.
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (isClient && !hydrated) {
    // Hydrate from localStorage once, right after hydration ("adjust state
    // during render": React re-renders immediately, before committing).
    const stored = readStoredState();

    setSavedAccounts(stored.savedAccounts);
    setSelectedAccountState(stored.selectedAccount);
    setCollectionSelectedAccountsState(stored.collectionSelectedAccounts);
    setHydrated(true);
  }

  if (!loggedInAccount && monitored !== LOGGED_OUT_MONITORED_STATE) {
    // Logged out (or auth still loading): clear the monitored accounts. Also
    // discards a response that arrives for an account that has since logged out.
    setMonitored(LOGGED_OUT_MONITORED_STATE);
  }

  const monitoredAccounts = monitored.accounts;
  const monitoredAccountTokens = monitored.tokens;
  const monitoredLoadedFor = monitored.loadedFor;

  const refreshMonitoredAccounts = useCallback((): Promise<void> => {
    // Logged out: the render-time reset above already cleared the state.
    if (!loggedInAccount) return Promise.resolve();

    // State is only set once the request settles (never synchronously).
    return getMonitoredAccounts().then(
      (rows) => {
        const accounts = normalizeAccounts(rows.map((entry) => entry.username));
        setMonitored({
          loadedFor: loggedInAccount,
          accounts,
          // The same rows already carry the SPL token state, so publishing it here
          // costs no extra round trip and replaces the per-card `getAccountTokenStatus`
          // call that every `AuthenticationStatus` used to make.
          tokens: Object.fromEntries(
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
          ),
        });
        // If an account is now monitored, it is no longer considered a removable local account.
        setSavedAccounts((current) => {
          const filtered = current.filter((account) => !accounts.includes(account));
          return arraysEqual(filtered, current) ? current : filtered;
        });
      },
      (err: unknown) => {
        // Even on failure: reconcile against what is known rather than never.
        setMonitored((prev) => ({ ...prev, loadedFor: loggedInAccount }));
        throw err;
      }
    );
    // `reAuthVersion` / `tokenStatusVersion` are intentional "refetch triggers":
    // they are not read in the body, but bumping either must re-read the token
    // state so the dashboard reflects a fresh JWT without a page reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInAccount, reAuthVersion, tokenStatusVersion]);

  useEffect(() => {
    // Loads server-side monitored accounts; state is only set once the request settles.
    refreshMonitoredAccounts();
  }, [refreshMonitoredAccounts]);

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

  // Account options are only complete once auth and the monitored accounts have
  // loaded. Reconciling earlier would drop a stored monitored account and then
  // re-select it, making every account-keyed loader fetch twice.
  const optionsLoaded = hydrated && !authLoading && monitoredLoadedFor === loggedInAccount;

  if (optionsLoaded) {
    // Reconcile the persisted selection against the currently valid account
    // options (which arrive asynchronously) — "adjust state during render", so
    // consumers never see `accountsReady` with an unreconciled selection. Both
    // writes are guarded by an equality check so this converges rather than looping.
    const safeSelected =
      selectedAccount && accountOptions.includes(selectedAccount)
        ? selectedAccount
        : loggedInAccount && accountOptions.includes(loggedInAccount)
          ? loggedInAccount
          : (accountOptions[0] ?? "");

    // Only drops accounts that are no longer options; an empty selection stays
    // empty (the cards page then falls back to `selectedAccount`).
    const nextCollection = normalizeAccounts(
      collectionSelectedAccounts.filter((account) => accountOptions.includes(account))
    );

    if (safeSelected !== selectedAccount) {
      setSelectedAccountState(safeSelected);
    }

    if (!arraysEqual(nextCollection, collectionSelectedAccounts)) {
      setCollectionSelectedAccountsState(nextCollection);
    }
  }

  useEffect(() => {
    // Writing before hydration would overwrite the stored state with the empty defaults.
    if (typeof window === "undefined" || !hydrated) return;

    const nextState: StoredAccountsState = {
      savedAccounts,
      selectedAccount,
      collectionSelectedAccounts,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [collectionSelectedAccounts, hydrated, savedAccounts, selectedAccount]);

  // Single-account pick (every page but /collection/cards). Leaves
  // `collectionSelectedAccounts` alone — only the cards page writes that.
  const setSelectedAccount = useCallback((account: string) => {
    const normalized = normalizeAccount(account);
    if (!normalized) return;
    setSelectedAccountState(normalized);
  }, []);

  const setCollectionSelectedAccounts = useCallback(
    (accounts: string[]) => {
      const normalized = normalizeAccounts(accounts).filter((account) =>
        accountOptions.includes(account)
      );
      // Cards-page selection only; the single-account selection stays independent.
      setCollectionSelectedAccountsState(normalized);
    },
    [accountOptions]
  );

  const addLocalAccount = useCallback((account: string) => {
    const normalized = normalizeAccount(account);
    if (!normalized) return;

    setSavedAccounts((current) => normalizeAccounts([...current, normalized]));
    setSelectedAccountState(normalized);
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
      accountsReady: optionsLoaded,
    }),
    [
      accountOptions,
      addLocalAccount,
      collectionSelectedAccounts,
      monitoredAccounts,
      monitoredAccountTokens,
      optionsLoaded,
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
