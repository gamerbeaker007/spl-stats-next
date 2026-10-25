"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import {
  deleteAssetWatch,
  listAssetWatches,
  upsertAssetWatch,
} from "@/lib/backend/db/asset-watches";
import logger from "@/lib/backend/log/logger.server";
import { rethrowFrameworkErrors } from "@/lib/backend/next-errors";
import { MARKETPLACE_ASSET_MODEL } from "@/lib/shared/marketplace-asset-model";
import type { AssetWatch } from "@/types/asset-watch";

const MAX_WATCH_PRICE_USD = 1_000_000_000;

function isValidAsset(assetName: string, detailId: string): boolean {
  return (
    Object.hasOwn(MARKETPLACE_ASSET_MODEL, assetName) &&
    typeof detailId === "string" &&
    detailId.length > 0 &&
    detailId.length <= 100
  );
}

export async function getAssetWatchesAction(assetName: string): Promise<AssetWatch[]> {
  if (!isValidAsset(assetName, "x")) return [];
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    return await listAssetWatches(user.username, assetName);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`getAssetWatchesAction error: ${error}`);
    return [];
  }
}

/** The price snapshot is the caller's own reference point; it is range-checked only. */
export async function watchAssetAction(
  assetName: string,
  detailId: string,
  priceUsd: number
): Promise<void> {
  if (!isValidAsset(assetName, detailId)) throw new Error("Invalid asset");
  if (!Number.isFinite(priceUsd) || priceUsd < 0 || priceUsd > MAX_WATCH_PRICE_USD) {
    throw new Error("Invalid price");
  }
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    await upsertAssetWatch(user.username, assetName, detailId, priceUsd);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`watchAssetAction error: ${error}`);
    throw new Error("Failed to watch item");
  }
}

export async function unwatchAssetAction(assetName: string, detailId: string): Promise<void> {
  if (!isValidAsset(assetName, detailId)) throw new Error("Invalid asset");
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not logged in");
    await deleteAssetWatch(user.username, assetName, detailId);
  } catch (error) {
    rethrowFrameworkErrors(error);
    logger.error(`unwatchAssetAction error: ${error}`);
    throw new Error("Failed to unwatch item");
  }
}
