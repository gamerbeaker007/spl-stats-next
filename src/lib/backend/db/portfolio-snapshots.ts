import prisma from "@/lib/prisma";
import type { PortfolioData } from "@/types/portfolio";
import { Prisma } from "@prisma/client";

function toDateOnly(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

/** Insert or overwrite a portfolio snapshot for a given (username, date). */
export async function upsertPortfolioSnapshot(data: PortfolioData): Promise<void> {
  const date = toDateOnly(data.date);

  const fields = {
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
    inventoryValue: data.inventoryValue,
    inventoryQty: data.inventoryQty,
    inventoryDetail: data.inventoryDetail as unknown as Prisma.InputJsonValue,
    decPriceUsd: data.decPriceUsd,
    hivePriceUsd: data.hivePriceUsd,
    spsPriceUsd: data.spsPriceUsd,
  };

  await prisma.portfolioSnapshot.upsert({
    where: { username_date: { username: data.username, date } },
    create: { date, username: data.username, ...fields },
    update: fields,
  });
}

/** Return all portfolio snapshots for a given username, ordered by date asc. */
export async function getPortfolioSnapshots(username: string) {
  return prisma.portfolioSnapshot.findMany({
    where: { username },
    orderBy: { date: "asc" },
  });
}

/** Return the latest portfolio snapshot for a given username. */
export async function getLatestPortfolioSnapshot(username: string) {
  return prisma.portfolioSnapshot.findFirst({
    where: { username },
    orderBy: { date: "desc" },
  });
}

/** Delete all portfolio snapshots for a username (used when removing monitored account). */
export async function deletePortfolioSnapshotsByUsername(username: string) {
  return prisma.portfolioSnapshot.deleteMany({ where: { username } });
}
