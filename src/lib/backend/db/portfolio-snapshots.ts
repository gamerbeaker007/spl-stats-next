import prisma from "@/lib/prisma";
import type { PortfolioData } from "@/types/portfolio";
import { Prisma } from "@prisma/client";

function toDateOnly(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function buildSnapshotFields(data: PortfolioData) {
  return {
    collectionMarketValue: data.collectionMarketValue,
    collectionListValue: data.collectionListValue,
    collectionDetails: data.collectionDetails as unknown as Prisma.InputJsonValue,
    decValue: data.decValue,
    decQty: data.decQty,
    decStakedValue: data.decStakedValue,
    decStakedQty: data.decStakedQty,
    spsValue: data.spsValue,
    spsQty: data.spsQty,
    spspValue: data.spspValue,
    spspQty: data.spspQty,
    voucherValue: data.voucherValue,
    voucherQty: data.voucherQty,
    creditsValue: data.creditsValue,
    creditsQty: data.creditsQty,
    decBValue: data.decBValue,
    decBQty: data.decBQty,
    voucherGValue: data.voucherGValue,
    voucherGQty: data.voucherGQty,
    licenseValue: data.licenseValue,
    licenseQty: data.licenseQty,
    deedsValue: data.deedsValue,
    deedsQty: data.deedsQty,
    deedDetails: data.deedDetails as unknown as Prisma.InputJsonValue,
    landResourceValue: data.landResourceValue,
    landResourceQty: data.landResourceQty,
    landResourceDetailed: data.landResourceDetailed as unknown as Prisma.InputJsonValue,
    liqPoolDecValue: data.liqPoolDecValue,
    liqPoolDecQty: data.liqPoolDecQty,
    liqPoolSpsValue: data.liqPoolSpsValue,
    liqPoolSpsQty: data.liqPoolSpsQty,
    liqPoolDetailed: data.liqPoolDetailed as unknown as Prisma.InputJsonValue,
    inventoryValue: data.inventoryValue,
    inventoryQty: data.inventoryQty,
    inventoryDetail: data.inventoryDetail as unknown as Prisma.InputJsonValue,
    decPriceUsd: data.decPriceUsd,
    hivePriceUsd: data.hivePriceUsd,
    spsPriceUsd: data.spsPriceUsd,
  };
}

/** Insert or overwrite a portfolio snapshot for a given (username, date). */
export async function upsertPortfolioSnapshot(data: PortfolioData): Promise<void> {
  const date = toDateOnly(data.date);
  const fields = buildSnapshotFields(data);
  await prisma.portfolioSnapshot.upsert({
    where: { username_date: { username: data.username, date } },
    create: { date, username: data.username, ...fields },
    update: fields,
  });
}

/** Batch upsert portfolio snapshots in a single transaction. */
export async function upsertPortfolioSnapshotBatch(items: PortfolioData[]): Promise<void> {
  if (items.length === 0) return;
  await prisma.$transaction(
    items.map((data) => {
      const date = toDateOnly(data.date);
      const fields = buildSnapshotFields(data);
      return prisma.portfolioSnapshot.upsert({
        where: { username_date: { username: data.username, date } },
        create: { date, username: data.username, ...fields },
        update: fields,
      });
    })
  );
}

/** Scalar value/qty columns used by the portfolio value history (no JSON detail columns). */
const VALUE_HISTORY_SELECT = {
  date: true,
  collectionMarketValue: true,
  collectionListValue: true,
  decValue: true,
  decQty: true,
  decStakedValue: true,
  decStakedQty: true,
  spsValue: true,
  spsQty: true,
  spspValue: true,
  spspQty: true,
  voucherValue: true,
  voucherQty: true,
  creditsValue: true,
  creditsQty: true,
  decBValue: true,
  decBQty: true,
  voucherGValue: true,
  voucherGQty: true,
  licenseValue: true,
  licenseQty: true,
  deedsValue: true,
  deedsQty: true,
  landResourceValue: true,
  landResourceQty: true,
  liqPoolDecValue: true,
  liqPoolDecQty: true,
  liqPoolSpsValue: true,
  liqPoolSpsQty: true,
  inventoryValue: true,
  inventoryQty: true,
} satisfies Prisma.PortfolioSnapshotSelect;

/** Portfolio value history (scalar totals only) for a username, ordered by date asc. */
export async function getPortfolioValueSnapshots(username: string) {
  return prisma.portfolioSnapshot.findMany({
    where: { username },
    orderBy: { date: "asc" },
    select: VALUE_HISTORY_SELECT,
  });
}

/** Per-edition collection history for a username, ordered by date asc. */
export async function getPortfolioCollectionSnapshots(username: string) {
  return prisma.portfolioSnapshot.findMany({
    where: { username },
    orderBy: { date: "asc" },
    select: {
      date: true,
      collectionMarketValue: true,
      collectionListValue: true,
      collectionDetails: true,
    },
  });
}

/** Per-item inventory history for a username, ordered by date asc. */
export async function getPortfolioInventorySnapshots(username: string) {
  return prisma.portfolioSnapshot.findMany({
    where: { username },
    orderBy: { date: "asc" },
    select: { date: true, inventoryValue: true, inventoryQty: true, inventoryDetail: true },
  });
}

/** Return the latest portfolio snapshot for a given username (without the unused deed details). */
export async function getLatestPortfolioSnapshot(username: string) {
  return prisma.portfolioSnapshot.findFirst({
    where: { username },
    orderBy: { date: "desc" },
    omit: { deedDetails: true },
  });
}

/** Delete all portfolio snapshots for a username (used when removing monitored account). */
export async function deletePortfolioSnapshotsByUsername(username: string) {
  return prisma.portfolioSnapshot.deleteMany({ where: { username } });
}
