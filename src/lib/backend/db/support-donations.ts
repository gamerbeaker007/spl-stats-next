import prisma from "@/lib/prisma";
import type { SupportDonation } from "@prisma/client";

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
