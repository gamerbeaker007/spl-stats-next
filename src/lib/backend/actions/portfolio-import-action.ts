"use server";

import { isAdmin } from "@/lib/backend/auth/admin";
import { upsertPortfolioSnapshot } from "@/lib/backend/db/portfolio-snapshots";
import type { CollectionEditionDetail, PortfolioData } from "@/types/portfolio";
import { getCurrentUser } from "./auth-actions";

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Simple RFC-4180 CSV parser. Returns header row + data rows as string arrays. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const line of lines) {
    if (line.trim() === "") continue;
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuote = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }

  return rows;
}

function num(v: string | undefined): number {
  if (v === undefined || v === "" || v === null) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function int(v: string | undefined): number {
  return Math.round(num(v));
}

// ---------------------------------------------------------------------------
// Edition IDs tracked in the old CSV format
// ---------------------------------------------------------------------------

const EDITION_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 17, 18];

// Columns whose values are assigned to named PortfolioData fields.
// Key = CSV column name, value = PortfolioData field name.
const NAMED_COLUMNS: Record<string, keyof PortfolioData> = {
  collection_market_value: "collectionMarketValue",
  collection_list_value: "collectionListValue",
  dec_qty: "decQty",
  dec_value: "decValue",
  dec_staked_qty: "decStakedQty",
  dec_staked_value: "decStakedValue",
  spsp_qty: "spspQty",
  spsp_value: "spspValue",
  sps_qty: "spsQty",
  sps_value: "spsValue",
  voucher_qty: "voucherQty",
  voucher_value: "voucherValue",
  "voucher-g_qty": "voucherGQty",
  "voucher-g_value": "voucherGValue",
  credits_qty: "creditsQty",
  credits_value: "creditsValue",
  deeds_qty: "deedsQty",
  deeds_value: "deedsValue",
  license_qty: "licenseQty",
  license_value: "licenseValue",
  land_resources_value: "landResourceValue",
  liq_pool_dec_qty: "liqPoolDecQty",
  liq_pool_sps_qty: "liqPoolSpsQty",
};

// Columns whose values are used both in named fields AND in collection detail computation.
// These are handled separately and skipped in the generic "other" pass.
const COLLECTION_PREFIXES = EDITION_IDS.map(String);

// ---------------------------------------------------------------------------
// Row transformation
// ---------------------------------------------------------------------------

function rowToPortfolioData(header: string[], cells: string[]): PortfolioData | null {
  const col = (name: string): string | undefined => {
    const idx = header.indexOf(name);
    return idx >= 0 ? cells[idx] : undefined;
  };

  const dateStr = col("date");
  const username = col("account_name");

  if (!dateStr || !username) return null;

  // Parse date as UTC midnight
  const dateParts = dateStr.split("-");
  if (dateParts.length !== 3) return null;
  const date = new Date(
    Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
  );
  if (isNaN(date.getTime())) return null;

  // Build portfolio data with named columns
  const data: PortfolioData = {
    date,
    username: username.toLowerCase().trim(),
    collectionMarketValue: 0,
    collectionListValue: 0,
    collectionDetails: [],
    decValue: 0,
    decQty: 0,
    decStakedValue: 0,
    decStakedQty: 0,
    spsValue: 0,
    spsQty: 0,
    spspValue: 0,
    spspQty: 0,
    voucherValue: 0,
    voucherQty: 0,
    creditsValue: 0,
    creditsQty: 0,
    decBValue: 0,
    decBQty: 0,
    voucherGValue: 0,
    voucherGQty: 0,
    licenseValue: 0,
    licenseQty: 0,
    deedsValue: 0,
    deedsQty: 0,
    deedDetails: [],
    landResourceValue: 0,
    landResourceQty: 0,
    landResourceDetailed: [],
    liqPoolDecValue: 0,
    liqPoolDecQty: 0,
    liqPoolSpsValue: 0,
    liqPoolSpsQty: 0,
    inventoryValue: 0,
    inventoryQty: 0,
    inventoryDetail: [],
    decPriceUsd: 0,
    hivePriceUsd: 0,
    spsPriceUsd: 0,
  };

  // Apply named column mappings
  for (const [csvCol, field] of Object.entries(NAMED_COLUMNS)) {
    const v = col(csvCol);
    if (v !== undefined) {
      (data as unknown as Record<string, unknown>)[field] = num(v);
    }
  }

  // Split liq_pool_value 50/50 between dec and sps
  const liqPoolTotal = num(col("liq_pool_value"));
  data.liqPoolDecValue = liqPoolTotal / 2;
  data.liqPoolSpsValue = liqPoolTotal / 2;

  // Build collectionDetails from {n}_market_value, {n}_list_value, {n}_bcx, {n}_number_of_cards
  const collectionDetails: CollectionEditionDetail[] = [];
  for (const edId of COLLECTION_PREFIXES) {
    const marketValue = num(col(`${edId}_market_value`));
    const listValue = num(col(`${edId}_list_value`));
    const bcx = num(col(`${edId}_bcx`));
    const numberOfCards = int(col(`${edId}_number_of_cards`));
    if (marketValue === 0 && listValue === 0 && bcx === 0) continue;
    collectionDetails.push({
      edition: parseInt(edId),
      listValue,
      marketValue,
      bcx,
      numberOfCards,
    });
  }
  data.collectionDetails = collectionDetails;

  return data;
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export type ImportPortfolioResult =
  | {
      success: true;
      imported: number;
      skipped: number;
      errors: string[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * Admin-only server action.
 * Accepts CSV text in the old Python portfolio format.
 * Each row is transformed and upserted as a PortfolioSnapshot.
 */
export async function importPortfolioCsvAction(csvText: string): Promise<ImportPortfolioResult> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  if (!csvText || csvText.trim() === "") {
    return { success: false, error: "CSV is empty" };
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { success: false, error: "CSV must have a header row and at least one data row" };
  }

  const [header, ...dataRows] = rows;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // 1-based, accounting for header
    try {
      const data = rowToPortfolioData(header, dataRows[i]);
      if (!data) {
        skipped++;
        continue;
      }
      await upsertPortfolioSnapshot(data);
      imported++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Row ${rowNum}: ${msg}`);
      if (errors.length > 20) {
        errors.push("Too many errors — stopping");
        break;
      }
    }
  }

  return { success: true, imported, skipped, errors };
}
