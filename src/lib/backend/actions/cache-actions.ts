"use server";

import { CACHE_TAGS, CacheInvalidationTarget } from "@/lib/backend/cache/cache-tags";
import { revalidateTag } from "next/cache";

const REVALIDATE_PROFILE = "max";

function uniqueLower(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

export async function revalidateTagsAction(targets: CacheInvalidationTarget[]) {
  for (const target of targets) {
    if (target.type === "collection") {
      for (const username of uniqueLower(target.usernames)) {
        revalidateTag(CACHE_TAGS.splCollection(username), REVALIDATE_PROFILE);
      }
      continue;
    }

    if (target.type === "balances") {
      for (const username of uniqueLower(target.usernames)) {
        revalidateTag(CACHE_TAGS.splBalances(username), REVALIDATE_PROFILE);
      }
      continue;
    }

    if (target.type === "card-details") {
      revalidateTag(CACHE_TAGS.splCardDetails, REVALIDATE_PROFILE);
      continue;
    }

    if (target.type === "settings") {
      revalidateTag(CACHE_TAGS.splSettings, REVALIDATE_PROFILE);
      continue;
    }

    if (target.type === "maintenance") {
      revalidateTag(CACHE_TAGS.splMaintenance, REVALIDATE_PROFILE);
      continue;
    }

    if (target.type === "grouped-market") {
      revalidateTag(CACHE_TAGS.splGroupedMarket, REVALIDATE_PROFILE);
      continue;
    }
  }
}
