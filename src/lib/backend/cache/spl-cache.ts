"use server";

import {
  fetchCardCollection,
  fetchCardDetails,
  fetchMarketForSaleGrouped,
  fetchPlayerBalances,
  fetchSettings,
} from "@/lib/backend/api/spl/spl-api";
import { CACHE_TAGS } from "@/lib/backend/cache/cache-tags";
import { cacheLife, cacheTag } from "next/cache";

export async function getCachedSplSettings() {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.splSettings);
  return fetchSettings();
}

export async function getCachedSplMaintenanceSettings() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 60, expire: 300 });
  cacheTag(CACHE_TAGS.splMaintenance);
  return fetchSettings();
}

export async function getCachedSplCardDetails() {
  "use cache";
  cacheLife("days");
  cacheTag(CACHE_TAGS.splCardDetails);
  return fetchCardDetails();
}

export async function getCachedSplGroupedMarket() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.splGroupedMarket);
  return fetchMarketForSaleGrouped();
}

export async function getCachedSplCardCollection(username: string) {
  "use cache";
  cacheLife("hours");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splCollection(normalized));
  return fetchCardCollection(normalized);
}

export async function getCachedSplPlayerBalances(username: string) {
  "use cache";
  cacheLife("minutes");
  const normalized = username.trim().toLowerCase();
  cacheTag(CACHE_TAGS.splBalances(normalized));
  return fetchPlayerBalances(normalized);
}
