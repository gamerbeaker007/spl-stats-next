"use server";

import {
  getCachedLatestPortfolioSnapshot,
  getCachedPortfolioCollectionSnapshots,
  getCachedPortfolioInventorySnapshots,
  getCachedPortfolioInvestments,
  getCachedPortfolioValueSnapshots,
} from "@/lib/backend/cache/portfolio-cache";
import {
  addPortfolioInvestment,
  deletePortfolioInvestment,
  getPortfolioInvestmentById,
  updatePortfolioInvestmentNotes,
} from "@/lib/backend/db/portfolio-investments";
import type {
  CollectionEditionDetail,
  InventoryItemDetail,
  LandResourceDetail,
  LiquidityPoolDetail,
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
  landResourceDetails: LandResourceDetail[];

  liqPoolDecValue: number;
  liqPoolDecQty: number;
  liqPoolSpsValue: number;
  liqPoolSpsQty: number;
  liqPoolDetailed: LiquidityPoolDetail[];

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
  /** Sum of all deposits minus withdrawals for the selected accounts. */
  totalInvested: number;
}

export interface EditionHistoryValue {
  edition: number;
  marketValue: number;
  bcx: number;
}

export interface InventoryHistoryItem {
  name: string;
  assetName: string;
  value: number;
  qty: number;
}

/** One day of combined portfolio totals (scalar columns only — no per-edition/per-item detail). */
export interface PortfolioHistoryPoint {
  date: string;
  totalValue: number;
  collectionMarketValue: number;
  collectionListValue: number;
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

export interface CollectionHistoryPoint {
  date: string;
  collectionMarketValue: number;
  collectionListValue: number;
  editionValues: EditionHistoryValue[];
}

export interface InventoryHistoryPoint {
  date: string;
  inventoryValue: number;
  inventoryQty: number;
  items: InventoryHistoryItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Restricts `usernames` to the caller's monitored accounts — prevents IDOR.
 * Returns an empty list when not logged in.
 */
async function resolveMonitoredUsernames(usernames: string[]): Promise<string[]> {
  if (!usernames || usernames.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const monitoredAccounts = await getMonitoredAccounts();
  const monitoredSet = new Set(monitoredAccounts.map((a) => a.username));
  return Array.from(new Set(usernames.filter((u) => monitoredSet.has(u))));
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Groups per-account snapshot rows by UTC date, sorted ascending. */
function groupByDate<T extends { date: Date }>(rows: T[]): [string, T[]][] {
  const byDate = new Map<string, T[]>();
  for (const row of rows) {
    const key = toDateKey(row.date);
    const bucket = byDate.get(key);
    if (bucket) bucket.push(row);
    else byDate.set(key, [row]);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function sumField<T>(rows: T[], field: keyof T): number {
  return rows.reduce((acc, row) => acc + ((row[field] as unknown as number) ?? 0), 0);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function getTotalInvested(usernames: string[]): Promise<number> {
  const rows = await getCachedPortfolioInvestments(usernames);
  return rows.reduce((acc, inv) => acc + inv.amount, 0);
}

// ---------------------------------------------------------------------------
// Read actions
// ---------------------------------------------------------------------------

/**
 * Returns portfolio investment entries for the selected monitored usernames.
 */
export async function getPortfolioInvestmentsAction(
  usernames: string[]
): Promise<InvestmentEntry[]> {
  const safeUsernames = await resolveMonitoredUsernames(usernames);
  if (safeUsernames.length === 0) return [];

  const rawInvestments = await getCachedPortfolioInvestments(safeUsernames);
  return rawInvestments.map((inv) => ({
    id: inv.id,
    date: toDateKey(inv.date),
    username: inv.username,
    amount: inv.amount,
    notes: inv.notes ?? null,
  }));
}

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
 * Returns the combined latest portfolio snapshot and the total invested amount
 * for the given usernames (the "current values" tiles).
 */
export async function getPortfolioOverviewAction(
  usernames: string[]
): Promise<PortfolioOverviewResult> {
  const safeUsernames = await resolveMonitoredUsernames(usernames);
  if (safeUsernames.length === 0) return { snapshot: null, totalInvested: 0 };

  const [snapshotsByAccount, totalInvested] = await Promise.all([
    Promise.all(safeUsernames.map((u) => getCachedLatestPortfolioSnapshot(u))),
    getTotalInvested(safeUsernames),
  ]);

  const validSnapshots = snapshotsByAccount.filter((s): s is NonNullable<typeof s> => s !== null);
  if (validSnapshots.length === 0) return { snapshot: null, totalInvested };

  // Merge collection details across accounts (sum per edition)
  const editionMap = new Map<number, CollectionEditionDetail>();
  for (const snap of validSnapshots) {
    for (const d of asArray<CollectionEditionDetail>(snap.collectionDetails)) {
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

  const resourceMap = new Map<string, LandResourceDetail>();
  for (const snap of validSnapshots) {
    for (const d of asArray<LandResourceDetail>(snap.landResourceDetailed)) {
      const existing = resourceMap.get(d.resource);
      if (existing) {
        existing.qty += d.qty;
        existing.value += d.value;
        existing.liquidQty += d.liquidQty ?? d.qty;
        existing.liquidValue += d.liquidValue ?? d.value;
        existing.poolQty += d.poolQty ?? 0;
        existing.poolValue += d.poolValue ?? 0;
        existing.poolDecQty += d.poolDecQty ?? 0;
        existing.poolDecValue += d.poolDecValue ?? 0;
      } else {
        resourceMap.set(d.resource, {
          ...d,
          liquidQty: d.liquidQty ?? d.qty,
          liquidValue: d.liquidValue ?? d.value,
          poolQty: d.poolQty ?? 0,
          poolValue: d.poolValue ?? 0,
          poolDecQty: d.poolDecQty ?? 0,
          poolDecValue: d.poolDecValue ?? 0,
        });
      }
    }
  }

  const liqMap = new Map<string, LiquidityPoolDetail>();
  for (const snap of validSnapshots) {
    for (const d of asArray<LiquidityPoolDetail>(snap.liqPoolDetailed)) {
      if (!d || !d.token || !d.source) continue;
      const key = `${d.token}|${d.source}`;
      const existing = liqMap.get(key);
      if (existing) {
        existing.qty += d.qty;
        existing.value += d.value;
      } else {
        liqMap.set(key, { ...d });
      }
    }
  }

  const invMap = new Map<string, InventoryItemDetail>();
  for (const snap of validSnapshots) {
    for (const d of asArray<InventoryItemDetail>(snap.inventoryDetail)) {
      const existing = invMap.get(d.name);
      if (existing) {
        existing.qty += d.qty;
        existing.value += d.value;
      } else {
        invMap.set(d.name, { ...d });
      }
    }
  }

  const sum = (field: keyof (typeof validSnapshots)[number]) => sumField(validSnapshots, field);

  const snapshot: CombinedPortfolioSnapshot = {
    collectionMarketValue: sum("collectionMarketValue"),
    collectionListValue: sum("collectionListValue"),
    collectionDetails: Array.from(editionMap.values()).sort((a, b) => a.edition - b.edition),

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
    landResourceDetails: Array.from(resourceMap.values())
      .filter((d) => d.value > 0 || d.qty > 0)
      .sort((a, b) => b.value - a.value),

    liqPoolDecValue: sum("liqPoolDecValue"),
    liqPoolDecQty: sum("liqPoolDecQty"),
    liqPoolSpsValue: sum("liqPoolSpsValue"),
    liqPoolSpsQty: sum("liqPoolSpsQty"),
    liqPoolDetailed: Array.from(liqMap.values())
      .filter((d) => d.value > 0 || d.qty > 0)
      .sort((a, b) =>
        a.token === b.token ? a.source.localeCompare(b.source) : a.token.localeCompare(b.token)
      ),

    inventoryValue: sum("inventoryValue"),
    inventoryQty: sum("inventoryQty"),
    inventoryDetails: Array.from(invMap.values())
      .filter((d) => d.value > 0 || d.qty > 0)
      .sort((a, b) => b.value - a.value),
  };

  return { snapshot, totalInvested };
}

/**
 * Portfolio value history (totals per asset class) + cumulative investments.
 * Reads only scalar columns — the per-edition / per-item JSON lives in the
 * collection and inventory history actions so this payload stays small.
 */
export async function getPortfolioHistoryAction(
  usernames: string[]
): Promise<PortfolioHistoryResult> {
  const safeUsernames = await resolveMonitoredUsernames(usernames);
  if (safeUsernames.length === 0) return { history: [], cumulativeInvestments: [] };

  const [snapshotsByAccount, rawInvestments] = await Promise.all([
    Promise.all(safeUsernames.map((u) => getCachedPortfolioValueSnapshots(u))),
    getCachedPortfolioInvestments(safeUsernames),
  ]);

  const history: PortfolioHistoryPoint[] = groupByDate(snapshotsByAccount.flat()).map(
    ([date, snaps]) => {
      const nsum = (field: keyof (typeof snaps)[number]) => sumField(snaps, field);

      const collectionMarketValue = nsum("collectionMarketValue");
      const decValue = nsum("decValue");
      const decStakedValue = nsum("decStakedValue");
      const spsValue = nsum("spsValue");
      const spspValue = nsum("spspValue");
      const deedsValue = nsum("deedsValue");
      const landResourceValue = nsum("landResourceValue");
      const liqPoolValue = nsum("liqPoolDecValue") + nsum("liqPoolSpsValue");
      const voucherValue = nsum("voucherValue");
      const creditsValue = nsum("creditsValue");
      const decBValue = nsum("decBValue");
      const voucherGValue = nsum("voucherGValue");
      const licenseValue = nsum("licenseValue");
      const inventoryValue = nsum("inventoryValue");

      return {
        date,
        totalValue:
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
          inventoryValue,
        collectionMarketValue,
        collectionListValue: nsum("collectionListValue"),
        decValue,
        decStakedValue,
        spsValue,
        spsQty: nsum("spsQty"),
        spspValue,
        spspQty: nsum("spspQty"),
        decQty: nsum("decQty"),
        decStakedQty: nsum("decStakedQty"),
        voucherQty: nsum("voucherQty"),
        creditsQty: nsum("creditsQty"),
        decBQty: nsum("decBQty"),
        voucherGQty: nsum("voucherGQty"),
        licenseQty: nsum("licenseQty"),
        deedsQty: nsum("deedsQty"),
        landResourceQty: nsum("landResourceQty"),
        liqPoolQty: nsum("liqPoolDecQty") + nsum("liqPoolSpsQty"),
        inventoryQty: nsum("inventoryQty"),
        deedsValue,
        landResourceValue,
        liqPoolValue,
        voucherValue,
        creditsValue,
        decBValue,
        voucherGValue,
        licenseValue,
        inventoryValue,
      };
    }
  );

  let running = 0;
  const cumulativeInvestments: CumulativeInvestmentPoint[] = rawInvestments.map((inv) => {
    running += inv.amount;
    return { date: toDateKey(inv.date), cumulative: running };
  });

  return { history, cumulativeInvestments };
}

/** Per-edition collection market value + BCX history, merged across the selected accounts. */
export async function getCollectionHistoryAction(
  usernames: string[]
): Promise<CollectionHistoryPoint[]> {
  const safeUsernames = await resolveMonitoredUsernames(usernames);
  if (safeUsernames.length === 0) return [];

  const snapshotsByAccount = await Promise.all(
    safeUsernames.map((u) => getCachedPortfolioCollectionSnapshots(u))
  );

  return groupByDate(snapshotsByAccount.flat()).map(([date, snaps]) => {
    const edMap = new Map<number, EditionHistoryValue>();
    for (const snap of snaps) {
      for (const d of asArray<CollectionEditionDetail>(snap.collectionDetails)) {
        const entry = edMap.get(d.edition);
        if (entry) {
          entry.marketValue += d.marketValue;
          entry.bcx += d.bcx;
        } else {
          edMap.set(d.edition, { edition: d.edition, marketValue: d.marketValue, bcx: d.bcx });
        }
      }
    }
    return {
      date,
      collectionMarketValue: sumField(snaps, "collectionMarketValue"),
      collectionListValue: sumField(snaps, "collectionListValue"),
      editionValues: Array.from(edMap.values()).sort((a, b) => a.edition - b.edition),
    };
  });
}

/** Per-item inventory value + quantity history, merged across the selected accounts. */
export async function getInventoryHistoryAction(
  usernames: string[]
): Promise<InventoryHistoryPoint[]> {
  const safeUsernames = await resolveMonitoredUsernames(usernames);
  if (safeUsernames.length === 0) return [];

  const snapshotsByAccount = await Promise.all(
    safeUsernames.map((u) => getCachedPortfolioInventorySnapshots(u))
  );

  return groupByDate(snapshotsByAccount.flat()).map(([date, snaps]) => {
    const invMap = new Map<string, InventoryHistoryItem>();
    for (const snap of snaps) {
      for (const d of asArray<InventoryItemDetail>(snap.inventoryDetail)) {
        const entry = invMap.get(d.name);
        if (entry) {
          entry.value += d.value;
          entry.qty += d.qty;
        } else {
          invMap.set(d.name, {
            name: d.name,
            assetName: d.assetName ?? "OTHER",
            value: d.value,
            qty: d.qty,
          });
        }
      }
    }
    return {
      date,
      inventoryValue: sumField(snaps, "inventoryValue"),
      inventoryQty: sumField(snaps, "inventoryQty"),
      items: Array.from(invMap.values()).filter((i) => i.value > 0 || i.qty > 0),
    };
  });
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
    await revalidateTagsAction([
      { type: "portfolio-investments", usernames: [normalizedUsername] },
    ]);
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
    await revalidateTagsAction([{ type: "portfolio-investments", usernames: [inv.username] }]);
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
    await revalidateTagsAction([{ type: "portfolio-investments", usernames: [inv.username] }]);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
