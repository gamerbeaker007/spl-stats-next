"use server";

import { getPortfolioInvestments } from "@/lib/backend/db/portfolio-investments";
import {
  getLatestPortfolioSnapshot,
  getPortfolioSnapshots,
} from "@/lib/backend/db/portfolio-snapshots";
import { PORTFOLIO_CACHE_TAGS } from "@/lib/backend/cache/portfolio-cache-tags";
import { cacheLife, cacheTag } from "next/cache";

export async function getCachedPortfolioSnapshots(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.toLowerCase();
  cacheTag(PORTFOLIO_CACHE_TAGS.snapshots(normalized));
  return getPortfolioSnapshots(normalized);
}

export async function getCachedLatestPortfolioSnapshot(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.toLowerCase();
  cacheTag(PORTFOLIO_CACHE_TAGS.snapshots(normalized));
  return getLatestPortfolioSnapshot(normalized);
}

export async function getCachedPortfolioInvestments(usernames: string[]) {
  "use cache";
  cacheLife("hours");
  const normalized = usernames.map((u) => u.toLowerCase());
  for (const u of normalized) {
    cacheTag(PORTFOLIO_CACHE_TAGS.investments(u));
  }
  return getPortfolioInvestments(normalized);
}
