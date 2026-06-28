"use server";

import { fetchCardDetails } from "@/lib/backend/api/spl/spl-api";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { cacheLife } from "next/cache";

export async function getCardDetails(): Promise<SplCardDetail[]> {
  "use cache";
  cacheLife("hours");

  return await fetchCardDetails();
}
