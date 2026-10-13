"use client";

import { createBrowserCache } from "@/lib/frontend/browser-cache";
import {
  fetchMarketplaceAssetMeta,
  fetchMarketplaceLanding,
  fetchMarketplacePlayerAllListings,
  fetchPlayerSkins,
} from "@/lib/frontend/spl-browser-api";
import {
  applyQuantityOwnership,
  buildMarketplaceAssetItems,
  computeOutbidStatuses,
  groupMarketplaceAssetsByCardDetailId,
} from "@/lib/shared/marketplace-assets";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetMetaDetail,
  MarketplaceAssetName,
  MarketplacePlayerListing,
  OutbidStatus,
} from "@/types/marketplace-assets";
import type { SplSkin } from "@/types/spl/jackpot";

/**
 * Marketplace page data, read straight from SPL in the browser: market items with
 * the player's owned / listed counts, the player's listings and (skins) active
 * state. Prices and ownership (`/market/landing`) are always live. Two parts are
 * memoized per tab:
 * - item metadata, per asset type — shared, changes only on new releases;
 * - the player's listings, per account — one response covers every asset type, so
 *   switching market pages reuses it. Keyed on the purchase plan's refresh version,
 *   so a buy / list / transfer reads it fresh.
 * The payload builders' pre-flight (`loadOwnedAsset`) always reads live.
 */

const ASSET_META_TTL_MS = 10 * 60_000;
const PLAYER_LISTINGS_TTL_MS = 60_000;

const assetMetaCache = createBrowserCache<MarketplaceAssetMetaDetail[]>(ASSET_META_TTL_MS);
const playerListingsCache = createBrowserCache<MarketplacePlayerListing[]>(PLAYER_LISTINGS_TTL_MS);

/** Landing + metadata joined, in landing order (the API's own ordering). */
async function loadMarketplaceAssets(
  player: string | null,
  assetName: MarketplaceAssetName
): Promise<MarketplaceAssetItem[]> {
  const [landing, meta] = await Promise.all([
    fetchMarketplaceLanding(player, assetName),
    assetMetaCache(assetName, () => fetchMarketplaceAssetMeta(assetName)),
  ]);
  const landingOrder = new Map(landing.map((asset, index) => [asset.detailId, index]));
  return buildMarketplaceAssetItems(landing, meta, assetName).sort(
    (a, b) => (landingOrder.get(a.detailId) ?? 0) - (landingOrder.get(b.detailId) ?? 0)
  );
}

export interface MarketplacePageData {
  account: string | null;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  playerListings: MarketplacePlayerListing[];
  outbidStatuses: OutbidStatus[];
}

/** Skins get their `active` flag from `/players/skins`; other assets pass through. */
function withSkinActiveState(
  items: MarketplaceAssetItem[],
  assetName: MarketplaceAssetName,
  playerSkins: SplSkin[]
): MarketplaceAssetItem[] {
  if (assetName !== "SKINS") return items;
  const activeByDetailId = new Map(playerSkins.map((skin) => [skin.skin_detail_id, skin.active]));
  return items.map((item) => ({
    ...item,
    active: Boolean(activeByDetailId.get(item.detailIdNumber)),
  }));
}

/** `refreshVersion === null` reads the player's listings live (no memo). */
async function loadOwnedItems(
  account: string,
  assetName: MarketplaceAssetName,
  refreshVersion: number | null
) {
  const [items, playerSkins, playerListings] = await Promise.all([
    loadMarketplaceAssets(account, assetName),
    assetName === "SKINS" ? fetchPlayerSkins(account) : Promise.resolve([]),
    refreshVersion === null
      ? fetchMarketplacePlayerAllListings(account)
      : playerListingsCache(`${account}:${refreshVersion}`, () =>
          fetchMarketplacePlayerAllListings(account)
        ),
  ]);
  return {
    items: applyQuantityOwnership(
      withSkinActiveState(items, assetName, playerSkins),
      playerListings
    ),
    playerListings,
  };
}

export async function loadMarketplacePageData(
  account: string | null,
  assetName: MarketplaceAssetName,
  includeOutbidStatuses: boolean,
  refreshVersion: number
): Promise<MarketplacePageData> {
  const normalized = account?.trim().toLowerCase() || null;

  if (!normalized) {
    const items = (await loadMarketplaceAssets(null, assetName)).map((item) => ({
      ...item,
      ownedQuantity: 0,
      actualOwned: 0,
      currentlyListed: 0,
      availableToList: 0,
      numOwned: 0,
      active: false,
    }));
    return {
      account: null,
      assetName,
      items,
      groups: groupMarketplaceAssetsByCardDetailId(items),
      playerListings: [],
      outbidStatuses: [],
    };
  }

  const { items, playerListings } = await loadOwnedItems(normalized, assetName, refreshVersion);
  const assetListings = playerListings.filter((listing) => listing.assetName === assetName);

  return {
    account: normalized,
    assetName,
    items,
    groups: groupMarketplaceAssetsByCardDetailId(items),
    playerListings: assetListings,
    outbidStatuses: includeOutbidStatuses
      ? Array.from(computeOutbidStatuses(assetListings, items, assetName).values())
      : [],
  };
}

/**
 * One owned asset with live ownership / listing quantities and skin active state.
 * The payload builders' pre-flight (`lib/frontend/purchase/payload-builders.ts`).
 */
export async function loadOwnedAsset(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<MarketplaceAssetItem> {
  const { items } = await loadOwnedItems(account.trim().toLowerCase(), assetName, null);
  const owned = items.find((entry) => entry.detailId === detailId);
  if (!owned) throw new Error("Item not found for this account");
  return owned;
}
