import prisma from "@/lib/prisma";

export interface PortfolioInvestmentRow {
  id: string;
  date: Date;
  username: string;
  amount: number;
  createdAt: Date;
}

/** Insert a single investment entry. Skips silently if an exact duplicate exists. */
export async function upsertPortfolioInvestment(
  date: Date,
  username: string,
  amount: number
): Promise<"created" | "skipped"> {
  const dateOnly = toDateOnly(date);
  try {
    await prisma.portfolioInvestment.create({
      data: { date: dateOnly, username: username.toLowerCase().trim(), amount },
    });
    return "created";
  } catch (err: unknown) {
    // Unique constraint violation → duplicate, skip
    if (isPrismaUniqueViolation(err)) return "skipped";
    throw err;
  }
}

/** Add a manual deposit (positive) or withdrawal (negative amount).
 *  If an entry already exists for the same date + username, its amount is updated (accumulated). */
export async function addPortfolioInvestment(
  date: Date,
  username: string,
  amount: number
): Promise<PortfolioInvestmentRow> {
  const dateOnly = toDateOnly(date);
  const user = username.toLowerCase().trim();

  const existing = await prisma.portfolioInvestment.findFirst({
    where: { username: user, date: dateOnly },
  });

  if (existing) {
    return prisma.portfolioInvestment.update({
      where: { id: existing.id },
      data: { amount: existing.amount + amount },
    });
  }

  return prisma.portfolioInvestment.create({
    data: { date: dateOnly, username: user, amount },
  });
}

/** Delete a single investment entry by ID. */
export async function deletePortfolioInvestment(id: string): Promise<void> {
  await prisma.portfolioInvestment.delete({ where: { id } });
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

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
