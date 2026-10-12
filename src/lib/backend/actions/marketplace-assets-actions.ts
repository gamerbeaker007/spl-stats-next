"use server";

import {
  getCachedSplCardDetails,
  getCachedMarketplaceAssets,
  getCachedMarketplaceAssetsPublic,
  getCachedMarketplacePlayerAllListings,
  getCachedPlayerSkins,
  getCachedSplPrices,
} from "@/lib/backend/cache/spl-cache";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import type { FilterableCard } from "@/lib/shared/card-filter-utils";
import {
  applyQuantityOwnership,
  computeOutbidStatuses,
  groupMarketplaceAssetsByCardDetailId,
} from "@/lib/shared/marketplace-assets";
import { toCardRarity } from "@/lib/shared/rarity-utils";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetName,
  MarketplacePlayerListing,
  OutbidStatus,
} from "@/types/marketplace-assets";
import { type CardColor, toCardRole } from "@/types/card";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { SplSkin } from "@/types/spl/jackpot";

function normalizeAccount(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }
  return normalized;
}

function buildPublicSkinFilterCards(
  details: SplCardDetail[],
  groups: MarketplaceAssetGroup[]
): Record<number, FilterableCard[]> {
  const detailById = new Map(details.map((detail) => [detail.id, detail]));
  const cards: Record<number, FilterableCard[]> = {};

  for (const group of groups) {
    const detail = detailById.get(group.cardDetailId);
    if (!detail) continue;

    const editions = detail.editions
      .split(",")
      .map((edition) => Number.parseInt(edition.trim(), 10))
      .filter((edition) => Number.isInteger(edition));
    if (editions.length === 0) editions.push(detail.distribution?.[0]?.edition ?? 0);

    cards[group.cardDetailId] = Array.from(new Set(editions)).map((edition) => ({
      cardDetailId: detail.id,
      edition,
      tier: detail.tier ?? edition,
      rarity: toCardRarity(detail.rarity),
      color: detail.color as CardColor,
      secondaryColor: detail.secondary_color ?? undefined,
      role: toCardRole(detail.type),
    }));
  }

  return cards;
}

export async function getMarketplaceAssetsPageDataAction(
  account: string | null,
  assetName: MarketplaceAssetName,
  options?: {
    includeDetailedCollection?: boolean;
    includeOutbidStatuses?: boolean;
  }
): Promise<{
  account: string | null;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  detailedCollection: Awaited<ReturnType<typeof getDetailedPlayerCardCollectionCached>>;
  publicSkinFilterCards: Record<number, FilterableCard[]>;
  playerListings: MarketplacePlayerListing[];
  outbidStatuses: OutbidStatus[];
}> {
  const includeDetailedCollection = options?.includeDetailedCollection ?? assetName === "SKINS";
  const includeOutbidStatuses = options?.includeOutbidStatuses ?? true;
  // Card metadata lets the client apply the card filter to skin groups whose base
  // card the account does not own (or when no account is selected at all).
  const includeCardDetails = assetName === "SKINS" && includeDetailedCollection;
  const normalized = account ? normalizeAccount(account) : null;

  if (!normalized) {
    const [publicItems, cardDetails] = await Promise.all([
      getCachedMarketplaceAssetsPublic(assetName),
      includeCardDetails ? getCachedSplCardDetails() : Promise.resolve([]),
    ]);
    const enrichedPublicItems = publicItems.map((item) => ({
      ...item,
      ownedQuantity: 0,
      actualOwned: 0,
      currentlyListed: 0,
      availableToList: 0,
      numOwned: 0,
      active: false,
    }));

    const groups = groupMarketplaceAssetsByCardDetailId(enrichedPublicItems);

    return {
      account: null,
      assetName,
      items: enrichedPublicItems,
      groups,
      detailedCollection: {},
      publicSkinFilterCards: buildPublicSkinFilterCards(cardDetails, groups),
      playerListings: [],
      outbidStatuses: [],
    };
  }

  const [items, detailedCollection, playerSkins, playerListings, cardDetails] = await Promise.all([
    getCachedMarketplaceAssets(normalized, assetName),
    includeDetailedCollection
      ? getDetailedPlayerCardCollectionCached(normalized)
      : Promise.resolve({} as Awaited<ReturnType<typeof getDetailedPlayerCardCollectionCached>>),
    assetName === "SKINS" ? getCachedPlayerSkins(normalized) : Promise.resolve([]),
    getCachedMarketplacePlayerAllListings(normalized),
    includeCardDetails ? getCachedSplCardDetails() : Promise.resolve([]),
  ]);

  // Enrich SKINS items with the player's active status from /players/skins.
  let enrichedItems = items;
  if (assetName === "SKINS" && playerSkins.length > 0) {
    const skinActiveById = new Map<number, boolean>(
      playerSkins.map((s) => [s.skin_detail_id, s.active])
    );
    enrichedItems = items.map((item) => ({
      ...item,
      active: Boolean(skinActiveById.get(item.detailIdNumber)),
    }));
  } else if (assetName === "SKINS") {
    enrichedItems = items.map((item) => ({ ...item, active: false }));
  }
  enrichedItems = applyQuantityOwnership(enrichedItems, playerListings);

  const assetListings = playerListings.filter((listing) => listing.assetName === assetName);
  const outbidStatuses = includeOutbidStatuses
    ? Array.from(computeOutbidStatuses(assetListings, enrichedItems, assetName).values())
    : [];

  const groups = groupMarketplaceAssetsByCardDetailId(enrichedItems);

  return {
    account: normalized,
    assetName,
    items: enrichedItems,
    groups,
    detailedCollection,
    publicSkinFilterCards: buildPublicSkinFilterCards(cardDetails, groups),
    playerListings: assetListings,
    outbidStatuses,
  };
}

/**
 * USD-per-DEC rate (shared ~1 min price cache). Used for DEC previews and by the
 * browser payload builders; the broadcast's `dec_mismatch_percent` (1.5%)
 * absorbs the cache age.
 */
export async function getDecPriceUsdAction(): Promise<number> {
  const prices = await getCachedSplPrices();
  return prices.dec;
}

/**
 * One owned asset with ownership/listing quantities and skin active state, from
 * the account's cached marketplace holdings. Used by the browser payload
 * builders (`lib/frontend/purchase/payload-builders.ts`) as their pre-flight.
 */
export async function getOwnedAssetAction(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<MarketplaceAssetItem> {
  const normalized = normalizeAccount(account);
  const [assets, playerListings, playerSkins] = await Promise.all([
    getCachedMarketplaceAssets(normalized, assetName),
    getCachedMarketplacePlayerAllListings(normalized),
    assetName === "SKINS" ? getCachedPlayerSkins(normalized) : Promise.resolve([]),
  ]);

  const activeSkinByDetailId = new Map<number, boolean>(
    playerSkins.map((skin) => [skin.skin_detail_id, skin.active])
  );
  const enrichedAssets =
    assetName === "SKINS"
      ? assets.map((asset) => ({
          ...asset,
          active: Boolean(activeSkinByDetailId.get(asset.detailIdNumber)),
        }))
      : assets;

  const owned = applyQuantityOwnership(enrichedAssets, playerListings).find(
    (entry) => entry.detailId === detailId
  );
  if (!owned) {
    throw new Error("Item not found for this account");
  }
  return owned;
}

/** The account's skins (`/players/skins`, cached) — active state per card. */
export async function getPlayerSkinsAction(account: string): Promise<SplSkin[]> {
  return getCachedPlayerSkins(normalizeAccount(account));
}
