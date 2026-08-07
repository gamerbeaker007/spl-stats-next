"use server";

import {
  getCachedPortfolioInvestments,
  getCachedPortfolioSnapshots,
} from "@/lib/backend/cache/portfolio-cache";
import {
  addPortfolioInvestment,
  deletePortfolioInvestment,
  getPortfolioInvestmentById,
  getPortfolioInvestments,
  updatePortfolioInvestmentNotes,
} from "@/lib/backend/db/portfolio-investments";
import type {
  CollectionEditionDetail,
  InventoryItemDetail,
  PortfolioData,
} from "@/types/portfolio";
import { getCurrentUser, getMonitoredAccounts } from "./auth-actions";
import { revalidateTagsAction } from "./cache-actions";

// ---------------------------------------------------------------------------
// Types returned to the client
// ---------------------------------------------------------------------------

export interface CombinedPortfolioSnapshot {
  collectionMarketValue: number;
  collectionListValue: number;
  collectionDetails: CollectionEditionDetail[];

  decValue: number;
  decQty: number;
  decStakedValue: number;
  decStakedQty: number;
  spsValue: number;
  spsQty: number;
  spspValue: number;
  spspQty: number;
  voucherValue: number;
  voucherQty: number;
  creditsValue: number;
  creditsQty: number;
  decBValue: number;
  decBQty: number;
  voucherGValue: number;
  voucherGQty: number;
  licenseValue: number;
  licenseQty: number;

  deedsValue: number;
  deedsQty: number;
  landResourceValue: number;
  landResourceQty: number;

  liqPoolDecValue: number;
  liqPoolDecQty: number;
  liqPoolSpsValue: number;
  liqPoolSpsQty: number;

  inventoryValue: number;
  inventoryQty: number;
  inventoryDetails: InventoryItemDetail[];
}

export interface InvestmentEntry {
  id: string;
  date: string; // ISO date string "YYYY-MM-DD"
  username: string;
  amount: number;
  notes: string | null;
}

export interface PortfolioOverviewResult {
  snapshot: CombinedPortfolioSnapshot | null;
  investments: InvestmentEntry[];
  /** Running cumulative investment total at each entry, in chronological order. */
  totalInvested: number;
}

/**
 * Returns portfolio investment entries for the selected monitored usernames.
 */
export async function getPortfolioInvestmentsAction(
  usernames: string[]
): Promise<InvestmentEntry[]> {
  if (!usernames || usernames.length === 0) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const monitoredAccounts = await getMonitoredAccounts();
  const monitoredSet = new Set(monitoredAccounts.map((a) => a.username));
  const safeUsernames = usernames.filter((u) => monitoredSet.has(u));
  if (safeUsernames.length === 0) return [];

  const rawInvestments = await getCachedPortfolioInvestments(safeUsernames);
  return rawInvestments.map((inv) => ({
    id: inv.id,
    date: inv.date.toISOString().slice(0, 10),
    username: inv.username,
    amount: inv.amount,
    notes: inv.notes ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Returns the current user's monitored account usernames.
 */
export async function getMonitoredUsernamesAction(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const accounts = await getMonitoredAccounts();
  return accounts.map((a) => a.username);
}

/**
 * Returns the combined latest portfolio snapshot and all investments
 * for the given usernames.
 */
export async function getPortfolioOverviewAction(
  usernames: string[]
): Promise<PortfolioOverviewResult> {
  if (!usernames || usernames.length === 0) {
    return { snapshot: null, investments: [], totalInvested: 0 };
  }

  const user = await getCurrentUser();
  if (!user) return { snapshot: null, investments: [], totalInvested: 0 };

  // Restrict to accounts the caller actually monitors — prevents IDOR
  const monitoredAccounts = await getMonitoredAccounts();
  const monitoredSet = new Set(monitoredAccounts.map((a) => a.username));
  const safeUsernames = usernames.filter((u) => monitoredSet.has(u));
  if (safeUsernames.length === 0) {
    return { snapshot: null, investments: [], totalInvested: 0 };
  }

  // Fetch latest snapshot for each username
  const snapshotsByAccount = await Promise.all(
    safeUsernames.map(async (username) => {
      const all = await getCachedPortfolioSnapshots(username);
      return all.length > 0 ? all[all.length - 1] : null;
    })
  );

  const validSnapshots = snapshotsByAccount.filter((s): s is NonNullable<typeof s> => s !== null);

  let combined: CombinedPortfolioSnapshot | null = null;

  if (validSnapshots.length > 0) {
    // Merge collection details across accounts (sum per edition)
    const editionMap = new Map<number, CollectionEditionDetail>();

    for (const snap of validSnapshots) {
      const details = (snap.collectionDetails ?? []) as unknown as CollectionEditionDetail[];
      for (const d of details) {
        const existing = editionMap.get(d.edition);
        if (existing) {
          existing.listValue += d.listValue;
          existing.marketValue += d.marketValue;
          existing.bcx += d.bcx;
          existing.numberOfCards += d.numberOfCards;
        } else {
          editionMap.set(d.edition, { ...d });
        }
      }
    }

    const collectionDetails = Array.from(editionMap.values()).sort((a, b) => a.edition - b.edition);

    const sum = (field: keyof PortfolioData): number =>
      validSnapshots.reduce((acc, s) => acc + ((s[field] as number) ?? 0), 0);

    combined = {
      collectionMarketValue: sum("collectionMarketValue"),
      collectionListValue: sum("collectionListValue"),
      collectionDetails,

      decValue: sum("decValue"),
      decQty: sum("decQty"),
      decStakedValue: sum("decStakedValue"),
      decStakedQty: sum("decStakedQty"),
      spsValue: sum("spsValue"),
      spsQty: sum("spsQty"),
      spspValue: sum("spspValue"),
      spspQty: sum("spspQty"),
      voucherValue: sum("voucherValue"),
      voucherQty: sum("voucherQty"),
      creditsValue: sum("creditsValue"),
      creditsQty: sum("creditsQty"),
      decBValue: sum("decBValue"),
      decBQty: sum("decBQty"),
      voucherGValue: sum("voucherGValue"),
      voucherGQty: sum("voucherGQty"),
      licenseValue: sum("licenseValue"),
      licenseQty: sum("licenseQty"),

      deedsValue: sum("deedsValue"),
      deedsQty: sum("deedsQty"),
      landResourceValue: sum("landResourceValue"),
      landResourceQty: sum("landResourceQty"),

      liqPoolDecValue: sum("liqPoolDecValue"),
      liqPoolDecQty: sum("liqPoolDecQty"),
      liqPoolSpsValue: sum("liqPoolSpsValue"),
      liqPoolSpsQty: sum("liqPoolSpsQty"),

      inventoryValue: sum("inventoryValue"),
      inventoryQty: sum("inventoryQty"),
      inventoryDetails: (() => {
        const invMap = new Map<string, InventoryItemDetail>();
        for (const snap of validSnapshots) {
          const details = (snap.inventoryDetail ?? []) as unknown as InventoryItemDetail[];
          for (const d of details) {
            const existing = invMap.get(d.name);
            if (existing) {
              existing.qty += d.qty;
              existing.value += d.value;
            } else {
              invMap.set(d.name, { ...d });
            }
          }
        }
        return Array.from(invMap.values())
          .filter((d) => d.value > 0 || d.qty > 0)
          .sort((a, b) => b.value - a.value);
      })(),
    };
  }

  // Investments
  const rawInvestments = await getCachedPortfolioInvestments(safeUsernames);
  const investments: InvestmentEntry[] = rawInvestments.map((inv) => ({
    id: inv.id,
    date: inv.date.toISOString().slice(0, 10),
    username: inv.username,
    amount: inv.amount,
    notes: inv.notes ?? null,
  }));

  const totalInvested = investments.reduce((acc, inv) => acc + inv.amount, 0);

  return { snapshot: combined, investments, totalInvested };
}

// ---------------------------------------------------------------------------
// Historical data types (for charts)
// ---------------------------------------------------------------------------

export interface EditionHistoryValue {
  edition: number;
  marketValue: number;
  bcx: number;
}

export interface InventoryHistoryItem {
  name: string;
  value: number;
  qty: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  totalValue: number;
  collectionMarketValue: number;
  collectionListValue: number;
  editionValues: EditionHistoryValue[];
  decValue: number;
  decStakedValue: number;
  spsValue: number;
  spsQty: number;
  spspValue: number;
  spspQty: number;
  decQty: number;
  decStakedQty: number;
  voucherQty: number;
  creditsQty: number;
  decBQty: number;
  voucherGQty: number;
  licenseQty: number;
  deedsQty: number;
  landResourceQty: number;
  liqPoolQty: number;
  inventoryQty: number;
  inventoryDetails: InventoryHistoryItem[];
  deedsValue: number;
  landResourceValue: number;
  liqPoolValue: number;
  voucherValue: number;
  creditsValue: number;
  decBValue: number;
  voucherGValue: number;
  licenseValue: number;
  inventoryValue: number;
}

export interface CumulativeInvestmentPoint {
  date: string;
  cumulative: number;
}

export interface PortfolioHistoryResult {
  history: PortfolioHistoryPoint[];
  cumulativeInvestments: CumulativeInvestmentPoint[];
}

// ---------------------------------------------------------------------------
// History action
// ---------------------------------------------------------------------------

export async function getPortfolioHistoryAction(
  usernames: string[]
): Promise<PortfolioHistoryResult> {
  if (!usernames || usernames.length === 0) {
    return { history: [], cumulativeInvestments: [] };
  }
  const user = await getCurrentUser();
  if (!user) return { history: [], cumulativeInvestments: [] };

  // Restrict to accounts the caller actually monitors — prevents IDOR
  const monitoredAccounts = await getMonitoredAccounts();
  const monitoredSet = new Set(monitoredAccounts.map((a) => a.username));
  const safeUsernames = usernames.filter((u) => monitoredSet.has(u));
  if (safeUsernames.length === 0) {
    return { history: [], cumulativeInvestments: [] };
  }

  const allSnapshots = (
    await Promise.all(safeUsernames.map((u) => getCachedPortfolioSnapshots(u)))
  ).flat();

  // Group snapshots by date string
  const byDate = new Map<string, typeof allSnapshots>();
  for (const snap of allSnapshots) {
    const dateStr = snap.date.toISOString().slice(0, 10);
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(snap);
  }

  const history: PortfolioHistoryPoint[] = [];

  for (const [date, snaps] of Array.from(byDate.entries()).sort()) {
    const nsum = (field: string): number =>
      snaps.reduce((acc, s) => acc + ((s as unknown as Record<string, number>)[field] ?? 0), 0);

    // Merge edition details across accounts for this date
    const edMap = new Map<number, EditionHistoryValue>();
    for (const snap of snaps) {
      const details = (snap.collectionDetails ?? []) as unknown as CollectionEditionDetail[];
      for (const d of details) {
        if (!edMap.has(d.edition)) {
          edMap.set(d.edition, { edition: d.edition, marketValue: 0, bcx: 0 });
        }
        const entry = edMap.get(d.edition)!;
        entry.marketValue += d.marketValue;
        entry.bcx += d.bcx;
      }
    }

    // Merge inventory details across accounts for this date
    const invMap = new Map<string, InventoryHistoryItem>();
    for (const snap of snaps) {
      const details = (snap.inventoryDetail ?? []) as unknown as InventoryItemDetail[];
      for (const d of details) {
        const key = d.name;
        if (!invMap.has(key)) {
          invMap.set(key, { name: d.name, value: 0, qty: 0 });
        }
        const entry = invMap.get(key)!;
        entry.value += d.value;
        entry.qty += d.qty;
      }
    }

    const collectionMarketValue = nsum("collectionMarketValue");
    const collectionListValue = nsum("collectionListValue");
    const decValue = nsum("decValue");
    const decStakedValue = nsum("decStakedValue");
    const spsValue = nsum("spsValue");
    const spsQty = nsum("spsQty");
    const spspValue = nsum("spspValue");
    const spspQty = nsum("spspQty");
    const decQty = nsum("decQty");
    const decStakedQty = nsum("decStakedQty");
    const voucherQty = nsum("voucherQty");
    const creditsQty = nsum("creditsQty");
    const decBQty = nsum("decBQty");
    const voucherGQty = nsum("voucherGQty");
    const licenseQty = nsum("licenseQty");
    const deedsQty = nsum("deedsQty");
    const landResourceQty = nsum("landResourceQty");
    const liqPoolQty = nsum("liqPoolDecQty") + nsum("liqPoolSpsQty");
    const inventoryQty = nsum("inventoryQty");
    const deedsValue = nsum("deedsValue");
    const landResourceValue = nsum("landResourceValue");
    const liqPoolValue = nsum("liqPoolDecValue") + nsum("liqPoolSpsValue");
    const voucherValue = nsum("voucherValue");
    const creditsValue = nsum("creditsValue");
    const decBValue = nsum("decBValue");
    const voucherGValue = nsum("voucherGValue");
    const licenseValue = nsum("licenseValue");
    const inventoryValue = nsum("inventoryValue");

    const totalValue =
      collectionMarketValue +
      decValue +
      decStakedValue +
      spsValue +
      spspValue +
      deedsValue +
      landResourceValue +
      liqPoolValue +
      voucherValue +
      creditsValue +
      decBValue +
      voucherGValue +
      licenseValue +
      inventoryValue;

    history.push({
      date,
      totalValue,
      collectionMarketValue,
      collectionListValue,
      editionValues: Array.from(edMap.values()).sort((a, b) => a.edition - b.edition),
      decValue,
      decStakedValue,
      spsValue,
      spsQty,
      spspValue,
      spspQty,
      decQty,
      decStakedQty,
      voucherQty,
      creditsQty,
      decBQty,
      voucherGQty,
      licenseQty,
      deedsQty,
      landResourceQty,
      liqPoolQty,
      inventoryQty,
      inventoryDetails: Array.from(invMap.values()).filter((i) => i.value > 0 || i.qty > 0),
      deedsValue,
      landResourceValue,
      liqPoolValue,
      voucherValue,
      creditsValue,
      decBValue,
      voucherGValue,
      licenseValue,
      inventoryValue,
    });
  }

  // Cumulative investments by date
  const rawInvestments = await getPortfolioInvestments(safeUsernames);
  let running = 0;
  const cumulativeInvestments: CumulativeInvestmentPoint[] = rawInvestments.map((inv) => {
    running += inv.amount;
    return { date: inv.date.toISOString().slice(0, 10), cumulative: running };
  });

  return { history, cumulativeInvestments };
}

// ---------------------------------------------------------------------------
// User investment CRUD (available to any authenticated user for their own accounts)
// ---------------------------------------------------------------------------

export type UserInvestmentResult = { success: true } | { success: false; error: string };

const INVESTMENT_NOTES_MAX_LENGTH = 140;

function normalizeUsernameInput(username: string): string {
  return username.trim().toLowerCase();
}

function parseDateOnly(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeInvestmentNotes(notes?: string | null): string | null {
  if (typeof notes !== "string") return null;

  const normalized = notes
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, INVESTMENT_NOTES_MAX_LENGTH);

  return normalized.length > 0 ? normalized : null;
}

export async function addUserInvestmentAction(
  dateStr: string,
  username: string,
  amount: number,
  type: "deposit" | "withdraw",
  notes?: string
): Promise<UserInvestmentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const normalizedUsername = normalizeUsernameInput(username);

  if (!dateStr || !normalizedUsername || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Date, username and a positive amount are required" };
  }

  // Verify the account is monitored by this user
  const accounts = await getMonitoredAccounts();
  const usernames = new Set(accounts.map((a) => a.username));
  if (!usernames.has(normalizedUsername)) {
    return { success: false, error: "Account not in your monitored list" };
  }

  const date = parseDateOnly(dateStr);
  if (!date) return { success: false, error: `Invalid date: ${dateStr}` };

  const storedAmount = type === "withdraw" ? -Math.abs(amount) : Math.abs(amount);
  const trimmedNotes = normalizeInvestmentNotes(notes);

  try {
    await addPortfolioInvestment(date, normalizedUsername, storedAmount, trimmedNotes ?? undefined);
    await revalidateTagsAction([{ type: "portfolio", usernames: [normalizedUsername] }]);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function updateUserInvestmentNotesAction(
  id: string,
  notes: string
): Promise<UserInvestmentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!id) return { success: false, error: "ID required" };

  const inv = await getPortfolioInvestmentById(id);
  if (!inv) return { success: false, error: "Investment not found" };

  const accounts = await getMonitoredAccounts();
  const monitoredUsernames = accounts.map((a) => a.username);
  if (!monitoredUsernames.includes(inv.username)) {
    return { success: false, error: "Access denied" };
  }

  try {
    await updatePortfolioInvestmentNotes(id, normalizeInvestmentNotes(notes));
    await revalidateTagsAction([{ type: "portfolio", usernames: [inv.username] }]);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function deleteUserInvestmentAction(id: string): Promise<UserInvestmentResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  if (!id) return { success: false, error: "ID required" };

  // Verify the investment belongs to one of this user's monitored accounts
  const inv = await getPortfolioInvestmentById(id);
  if (!inv) return { success: false, error: "Investment not found" };

  const accounts = await getMonitoredAccounts();
  const monitoredUsernames = accounts.map((a) => a.username);
  if (!monitoredUsernames.includes(inv.username)) {
    return { success: false, error: "Access denied" };
  }

  try {
    await deletePortfolioInvestment(id);
    await revalidateTagsAction([{ type: "portfolio", usernames: [inv.username] }]);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
