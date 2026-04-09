"use server";

import { isAdmin } from "@/lib/backend/auth/admin";
import {
  addPortfolioInvestment,
  createPortfolioInvestmentsBatch,
  deletePortfolioInvestment,
} from "@/lib/backend/db/portfolio-investments";
import { getCurrentUser } from "./auth-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportInvestmentResult =
  | { success: true; imported: number; skipped: number; errors: string[] }
  | { success: false; error: string };

export type AddInvestmentResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

/**
 * Admin-only server action.
 * Accepts CSV text with columns: [index,] date, account_name, amount
 * Inserts each row as a PortfolioInvestment; skips exact duplicates.
 */
export async function importInvestmentCsvAction(
  csvText: string,
  rowOffset = 0
): Promise<ImportInvestmentResult> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!csvText || csvText.trim() === "") {
    return { success: false, error: "CSV is empty" };
  }

  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) {
    return { success: false, error: "CSV must have a header row and at least one data row" };
  }

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim());
  const dateIdx = header.indexOf("date");
  const accountIdx = header.indexOf("account_name");
  const amountIdx = header.indexOf("amount");

  if (dateIdx < 0 || accountIdx < 0 || amountIdx < 0) {
    return {
      success: false,
      error: `CSV header must contain: date, account_name, amount. Found: ${lines[0]}`,
    };
  }

  let skipped = 0;
  const errors: string[] = [];
  const batch: { date: Date; username: string; amount: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = rowOffset + i + 1;
    try {
      const cells = lines[i].split(",").map((c) => c.trim());
      const dateStr = cells[dateIdx]?.trim();
      const username = cells[accountIdx]?.trim();
      const amountStr = cells[amountIdx]?.trim();

      if (!dateStr || !username || !amountStr) {
        skipped++;
        continue;
      }

      const dateParts = dateStr.split("-");
      if (dateParts.length !== 3) {
        errors.push(`Row ${rowNum}: invalid date "${dateStr}"`);
        continue;
      }
      const date = new Date(Date.UTC(+dateParts[0], +dateParts[1] - 1, +dateParts[2]));
      if (isNaN(date.getTime())) {
        errors.push(`Row ${rowNum}: unparseable date "${dateStr}"`);
        continue;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        errors.push(`Row ${rowNum}: invalid amount "${amountStr}"`);
        continue;
      }

      batch.push({ date, username, amount });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${rowNum}: ${msg}`);
      if (errors.length > 20) {
        errors.push("Too many errors — stopping");
        break;
      }
    }
  }

  const imported = await createPortfolioInvestmentsBatch(batch);
  skipped += batch.length - imported; // count duplicates as skipped

  return { success: true, imported, skipped, errors };
}

// ---------------------------------------------------------------------------
// Manual deposit / withdrawal
// ---------------------------------------------------------------------------

/**
 * Admin-only. Adds a deposit (positive) or withdrawal (negative) entry.
 * `type` is "deposit" | "withdraw" — the sign on `amount` is applied here.
 */
export async function addInvestmentAction(
  dateStr: string,
  username: string,
  amount: number,
  type: "deposit" | "withdraw"
): Promise<AddInvestmentResult> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!dateStr || !username || !amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Date, username and a positive amount are required" };
  }

  const dateParts = dateStr.split("-");
  if (dateParts.length !== 3) {
    return { success: false, error: `Invalid date: ${dateStr}` };
  }
  const date = new Date(Date.UTC(+dateParts[0], +dateParts[1] - 1, +dateParts[2]));
  if (isNaN(date.getTime())) {
    return { success: false, error: `Unparseable date: ${dateStr}` };
  }

  const storedAmount = type === "withdraw" ? -Math.abs(amount) : Math.abs(amount);

  try {
    await addPortfolioInvestment(date, username, storedAmount);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Admin-only. Deletes a single investment entry by ID.
 */
export async function deleteInvestmentAction(id: string): Promise<AddInvestmentResult> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!id) return { success: false, error: "ID required" };

  try {
    await deletePortfolioInvestment(id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
