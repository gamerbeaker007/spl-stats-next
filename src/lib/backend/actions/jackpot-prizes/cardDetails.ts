"use server";

import { getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { SplCardDetail } from "@/types/spl/cardDetails";

export async function getCardDetails(): Promise<SplCardDetail[]> {
  return getCachedSplCardDetails();
}
