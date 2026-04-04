"use server";

import { isAdmin } from "@/lib/backend/auth/admin";
import {
  upsertOpponentBattleCards,
  upsertPlayerBattleCards,
  type OpponentBattleCardInput,
  type PlayerBattleCardInput,
} from "@/lib/backend/db/battle-cards";
import { getCurrentUser } from "./auth-actions";

// ---------------------------------------------------------------------------
// CSV parsing (shared with portfolio import)
// ---------------------------------------------------------------------------

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

function str(v: string | undefined): string {
  return v?.trim() ?? "";
}

function numF(v: string | undefined): number {
  if (v === undefined || v === "") return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function numI(v: string | undefined): number {
  return Math.round(numF(v));
}

function bool(v: string | undefined): boolean {
  return v?.trim().toLowerCase() === "true";
}

// ---------------------------------------------------------------------------
// Row transformation
// ---------------------------------------------------------------------------

/**
 * Detect which CSV variant we're dealing with:
 * - "player"   → has "winner" and "result" columns (own team)
 * - "opponent" → no "winner" / "result" columns (opponent team on losses)
 */
function detectTeam(header: string[]): "player" | "opponent" {
  return header.includes("winner") ? "player" : "opponent";
}

interface RowBase {
  battleId: string;
  account: string;
  position: number;
  opponent: string;
  createdDate: Date;
  matchType: string;
  format: string;
  manaCap: number;
  ruleset1: string;
  ruleset2: string;
  ruleset3: string;
  inactive: string;
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  secondaryColor: string | null;
  xp: number | null;
  gold: boolean;
  level: number;
  edition: number;
}

function rowBase(
  header: string[],
  cells: string[],
  positionMap: Map<string, string>
): RowBase | null {
  const col = (name: string) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? cells[idx] : undefined;
  };

  const battleId = str(col("battle_id"));
  const account = str(col("account")).toLowerCase();
  const createdDateRaw = str(col("created_date"));

  if (!battleId || !account || !createdDateRaw) return null;

  const createdDate = new Date(createdDateRaw);
  if (isNaN(createdDate.getTime())) return null;

  const cardDetailId = numI(col("card_detail_id"));
  if (cardDetailId === 0) return null;

  const posKey = `${battleId}:${account}`;
  const prev = positionMap.get(posKey) ?? -1;
  const position = (prev as unknown as number) + 1;
  positionMap.set(posKey, position as unknown as string);

  return {
    battleId,
    account,
    position,
    opponent: str(col("opponent")).toLowerCase(),
    createdDate,
    matchType: str(col("match_type")) || "Ranked",
    format: str(col("format")) || "wild",
    manaCap: numF(col("mana_cap")),
    ruleset1: str(col("ruleset1")) || "None",
    ruleset2: str(col("ruleset2")) || "None",
    ruleset3: str(col("ruleset3")) || "None",
    inactive: str(col("inactive")),
    cardDetailId,
    cardName: str(col("card_name")),
    cardType: str(col("card_type")),
    rarity: numI(col("rarity")),
    color: str(col("color")),
    secondaryColor: str(col("secondary_color")) || null,
    xp: col("xp") !== undefined && str(col("xp")) !== "" ? numF(col("xp")) : null,
    gold: bool(col("gold")),
    level: numI(col("level")),
    edition: numI(col("edition")),
  };
}

function rowToPlayerCard(
  header: string[],
  cells: string[],
  positionMap: Map<string, string>
): PlayerBattleCardInput | null {
  const col = (name: string) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? cells[idx] : undefined;
  };
  const base = rowBase(header, cells, positionMap);
  if (!base) return null;
  return {
    ...base,
    winner: str(col("winner")),
    result: str(col("result")) || "loss",
  };
}

function rowToOpponentCard(
  header: string[],
  cells: string[],
  positionMap: Map<string, string>
): OpponentBattleCardInput | null {
  return rowBase(header, cells, positionMap);
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export type ImportBattleResult =
  | { success: true; imported: number; skipped: number; errors: string[] }
  | { success: false; error: string };

/**
 * Admin-only server action.
 * Accepts either the "battle" CSV (player team, has winner/result columns)
 * or the "losing" CSV (opponent team, no winner/result).
 * Auto-detects the variant from headers.
 */
export async function importBattleCsvAction(csvText: string): Promise<ImportBattleResult> {
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

  const [rawHeader, ...dataRows] = rows;
  // First column may be an unnamed index — skip it if it's empty or purely numeric header
  const firstCol = rawHeader[0]?.trim();
  const header = firstCol === "" || firstCol === "Unnamed: 0" ? rawHeader.slice(1) : rawHeader;
  const dataOffset = header === rawHeader ? 0 : 1; // how many leading cols to skip in data rows

  const normalizedHeader = header.map((h) => h.trim());
  const team = detectTeam(normalizedHeader);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const positionMap = new Map<string, string>(); // reused as number map via cast

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    try {
      const rawCells = dataRows[i];
      const cells = dataOffset > 0 ? rawCells.slice(dataOffset) : rawCells;

      if (team === "player") {
        const card = rowToPlayerCard(normalizedHeader, cells, positionMap);
        if (!card) {
          skipped++;
          continue;
        }
        await upsertPlayerBattleCards([card]);
      } else {
        const card = rowToOpponentCard(normalizedHeader, cells, positionMap);
        if (!card) {
          skipped++;
          continue;
        }
        await upsertOpponentBattleCards([card]);
      }

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
