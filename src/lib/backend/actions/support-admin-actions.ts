"use server";

import { isAdmin } from "@/lib/backend/auth/admin";
import {
  listSupportDonations,
  type SortOrder,
  type SupportDonationSortField,
} from "@/lib/backend/db/support-donations";
import { getCurrentUser } from "./auth-actions";

export type SupportDonationRow = {
  id: string;
  date: string;
  username: string;
  currency: string;
  amount: string;
  usdValue: string;
  tx: string;
  createdAt: string;
};

export async function getSupportDonationsAction(
  page = 1,
  limit = 25,
  sortBy: SupportDonationSortField = "date",
  order: SortOrder = "desc"
): Promise<
  | { success: true; donations: SupportDonationRow[]; total: number; pages: number }
  | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.username)) {
    return { success: false, error: "Unauthorized" };
  }

  const safeLimit = Math.min(Math.max(1, limit), 200);
  const safePage = Math.max(1, page);
  const safeSortBy: SupportDonationSortField =
    sortBy === "date" ||
    sortBy === "username" ||
    sortBy === "currency" ||
    sortBy === "amount" ||
    sortBy === "usdValue" ||
    sortBy === "tx"
      ? sortBy
      : "date";
  const safeOrder: SortOrder = order === "asc" ? "asc" : "desc";

  const { donations, total } = await listSupportDonations({
    page: safePage,
    limit: safeLimit,
    sortBy: safeSortBy,
    order: safeOrder,
  });

  return {
    success: true,
    donations: donations.map((donation) => ({
      id: donation.id,
      date: donation.date.toISOString(),
      username: donation.username,
      currency: donation.currency,
      amount: donation.amount.toString(),
      usdValue: donation.usdValue.toString(),
      tx: donation.tx,
      createdAt: donation.createdAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / safeLimit),
  };
}
