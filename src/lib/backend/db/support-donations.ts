import prisma from "@/lib/prisma";
import type { SupportDonation } from "@prisma/client";

export type SupportDonationSortField =
  | "date"
  | "username"
  | "currency"
  | "amount"
  | "usdValue"
  | "tx";
export type SortOrder = "asc" | "desc";

/** Prisma's `Decimal` columns accept a fixed-point string; 8 dp matches the schema. */
function toDecimalString(value: number): string {
  return value.toFixed(8);
}

export async function findSupportDonationByTx(tx: string): Promise<SupportDonation | null> {
  return prisma.supportDonation.findUnique({ where: { tx } });
}

export async function createSupportDonation(input: {
  date: Date;
  username: string;
  currency: string;
  amount: number;
  usdValue: number;
  tx: string;
}): Promise<SupportDonation> {
  return prisma.supportDonation.create({
    data: {
      date: input.date,
      username: input.username,
      currency: input.currency,
      amount: toDecimalString(input.amount),
      usdValue: toDecimalString(input.usdValue),
      tx: input.tx,
    },
  });
}

export async function listSupportDonations(opts: {
  page: number;
  limit: number;
  sortBy: SupportDonationSortField;
  order: SortOrder;
}) {
  const { page, limit, sortBy, order } = opts;
  const [donations, total] = await Promise.all([
    prisma.supportDonation.findMany({
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.supportDonation.count(),
  ]);
  return { donations, total };
}
