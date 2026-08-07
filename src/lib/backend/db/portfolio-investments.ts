import prisma from "@/lib/prisma";

export interface PortfolioInvestmentRow {
  id: string;
  date: Date;
  username: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
}

/** Insert a single investment entry. Skips silently if an exact duplicate exists. */
export async function upsertPortfolioInvestment(
  date: Date,
  username: string,
  amount: number,
  notes?: string
): Promise<"created" | "skipped"> {
  const dateOnly = toDateOnly(date);
  const normalizedUsername = username.toLowerCase().trim();

  const existing = await prisma.portfolioInvestment.findFirst({
    where: {
      username: normalizedUsername,
      date: dateOnly,
      amount,
    },
    select: { id: true },
  });

  if (existing) return "skipped";

  await prisma.portfolioInvestment.create({
    data: {
      date: dateOnly,
      username: normalizedUsername,
      amount,
      notes: notes ?? null,
    },
  });

  return "created";
}

function buildInvestmentSignature(username: string, date: Date, amount: number): string {
  return `${username.toLowerCase().trim()}|${date.toISOString().slice(0, 10)}|${amount}`;
}

function uniqueBySignature(
  items: { date: Date; username: string; amount: number }[]
): { date: Date; username: string; amount: number }[] {
  const out: { date: Date; username: string; amount: number }[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const normalized = {
      date: toDateOnly(item.date),
      username: item.username.toLowerCase().trim(),
      amount: item.amount,
    };
    const sig = buildInvestmentSignature(normalized.username, normalized.date, normalized.amount);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(normalized);
  }

  return out;
}

/** Add a manual deposit (positive) or withdrawal (negative amount). Always inserts a new row. */
export async function addPortfolioInvestment(
  date: Date,
  username: string,
  amount: number,
  notes?: string
): Promise<PortfolioInvestmentRow> {
  const dateOnly = toDateOnly(date);
  const user = username.toLowerCase().trim();

  return prisma.portfolioInvestment.create({
    data: { date: dateOnly, username: user, amount, notes: notes ?? null },
  });
}

/** Update the notes on an existing investment entry. */
export async function updatePortfolioInvestmentNotes(
  id: string,
  notes: string | null
): Promise<PortfolioInvestmentRow> {
  return prisma.portfolioInvestment.update({
    where: { id },
    data: { notes },
  });
}

/** Delete a single investment entry by ID. */
export async function deletePortfolioInvestment(id: string): Promise<void> {
  await prisma.portfolioInvestment.delete({ where: { id } });
}

/**
 * Batch insert investment entries, skipping duplicates.
 * Returns the number of newly created rows.
 */
export async function createPortfolioInvestmentsBatch(
  items: { date: Date; username: string; amount: number }[]
): Promise<number> {
  if (items.length === 0) return 0;

  const normalized = uniqueBySignature(items);
  if (normalized.length === 0) return 0;

  const usernames = Array.from(new Set(normalized.map((i) => i.username)));
  const dates = Array.from(new Set(normalized.map((i) => i.date.toISOString().slice(0, 10)))).map(
    (d) => new Date(`${d}T00:00:00.000Z`)
  );

  const existing = await prisma.portfolioInvestment.findMany({
    where: {
      username: { in: usernames },
      date: { in: dates },
    },
    select: {
      username: true,
      date: true,
      amount: true,
    },
  });

  const existingSignatures = new Set(
    existing.map((row) => buildInvestmentSignature(row.username, row.date, row.amount))
  );

  const data = normalized.filter(
    (item) =>
      !existingSignatures.has(buildInvestmentSignature(item.username, item.date, item.amount))
  );

  if (data.length === 0) return 0;

  const { count } = await prisma.portfolioInvestment.createMany({ data });
  return count;
}

/** Delete all investment entries for a given username. */
export async function deletePortfolioInvestmentsByUsername(username: string): Promise<number> {
  const { count } = await prisma.portfolioInvestment.deleteMany({
    where: { username: username.toLowerCase() },
  });
  return count;
}

/** Return a single investment entry by ID, or null if not found. */
export async function getPortfolioInvestmentById(
  id: string
): Promise<PortfolioInvestmentRow | null> {
  return prisma.portfolioInvestment.findUnique({ where: { id } });
}

/** Return all investment entries for the given usernames, ordered by date asc. */
export async function getPortfolioInvestments(
  usernames: string[]
): Promise<PortfolioInvestmentRow[]> {
  return prisma.portfolioInvestment.findMany({
    where: { username: { in: usernames.map((u) => u.toLowerCase()) } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateOnly(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
