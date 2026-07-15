"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { fetchPlayerBalances, fetchPlayerInventory } from "@/lib/backend/api/spl/spl-api";
import { fetchMarketplaceListingItems } from "@/lib/backend/api/spl/vapi-spl";
import {
  getCachedMarketplaceAssets,
  getCachedMarketplacePlayerAllListings,
  getCachedPlayerSkins,
  getCachedSplPlayerBalances,
  getCachedSplPlayerInventory,
} from "@/lib/backend/cache/spl-cache";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import {
  DEFAULT_SKIN_NAME,
  applyQuantityOwnership,
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  groupMarketplaceAssetsByCardDetailId,
  isActionableInventoryItem,
  isSkinActive,
  selectCheapestListings,
} from "@/lib/shared/marketplace-assets";
import {
  buildMarketplaceCancelPayload,
  buildMarketplaceListPayload,
  buildMarketplacePurchasePayload,
  buildSetSkinPayload,
  buildTokenTransferPayload,
  buildTransferItemsPayload,
  buildTransferSkinsPayload,
  normalizeRecipient,
  validatePositiveInteger,
  validateUsdPrice,
} from "@/lib/shared/transactions-builder";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetName,
  MarketplaceListingItem,
  OwnedAssetInstance,
} from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";

function normalizeAccount(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }
  return normalized;
}

function getTokenBalance(
  balances: Awaited<ReturnType<typeof fetchPlayerBalances>>,
  token: string
): number {
  return balances.find((entry) => entry.token === token)?.balance ?? 0;
}

function validateCardDetailId(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("Skin is missing card metadata required for activation");
  }
  return value;
}

/**
 * Validate that every requested uid is a currently-actionable copy the account
 * owns (re-checked against live inventory, since the page data may be cached).
 */
async function resolveActionableUids(account: string, requestedUids: string[]): Promise<string[]> {
  if (requestedUids.length === 0) {
    throw new Error("No items selected");
  }

  const inventory = await fetchPlayerInventory(account);
  const actionable = new Set(inventory.filter(isActionableInventoryItem).map((item) => item.uid));
  const valid = requestedUids.filter((uid) => actionable.has(uid));

  if (valid.length < requestedUids.length) {
    throw new Error(
      "Some selected items are no longer available (they may be listed, staked, or already transferred)."
    );
  }

  return valid;
}

export async function getMarketplaceAssetsPageDataAction(
  account: string,
  assetName: MarketplaceAssetName
): Promise<{
  account: string;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  detailedCollection: Awaited<ReturnType<typeof getDetailedPlayerCardCollectionCached>>;
}> {
  const normalized = normalizeAccount(account);

  const [items, detailedCollection, playerSkins, playerListings] = await Promise.all([
    getCachedMarketplaceAssets(normalized, assetName),
    getDetailedPlayerCardCollectionCached(normalized),
    assetName === "SKINS" ? getCachedPlayerSkins(normalized) : Promise.resolve([]),
    getCachedMarketplacePlayerAllListings(normalized),
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

  return {
    account: normalized,
    assetName,
    items: enrichedItems,
    groups: groupMarketplaceAssetsByCardDetailId(enrichedItems),
    detailedCollection,
  };
}

export async function getMarketplaceAssetListingsAction(
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<MarketplaceListingItem[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not logged in");
  }

  return fetchMarketplaceListingItems({
    assetName,
    detailIds: [detailId],
    sort: { field: "price", order: "asc" },
  });
}

/**
 * Every owned copy of a single asset for the account, with per-copy listed status
 * and the listing id to cancel. Drives the list/transfer copy-picker.
 */
export async function getOwnedAssetInstancesAction(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<OwnedAssetInstance[]> {
  const normalized = normalizeAccount(account);

  const [inventory, listings] = await Promise.all([
    getCachedSplPlayerInventory(normalized),
    fetchMarketplaceListingItems({
      assetName,
      detailIds: [detailId],
      sort: { field: "price", order: "asc" },
    }),
  ]);

  const ownListingByUid = new Map<string, { listingItemId: number; price: number }>();
  for (const listing of listings) {
    if (listing.seller.trim().toLowerCase() !== normalized) continue;
    ownListingByUid.set(listing.itemId, {
      listingItemId: listing.listingItemId,
      price: listing.price,
    });
  }

  // Match by string: detail ids are numeric for skins/music but string for many
  // asset types (packs `"CHAOS"`, consumables `"MIDNIGHTPOT"`, land resources `"TC"`).
  const temp = inventory
    .filter((item) => String(item.item_detail_id) === detailId)
    .map((item) => {
      const own = ownListingByUid.get(item.uid);
      return {
        uid: item.uid,
        listed: item.listed,
        inUse: item.in_use,
        actionable: isActionableInventoryItem(item),
        listingItemId: own?.listingItemId ?? null,
        price: own?.price ?? null,
      };
    })
    .sort((left, right) => {
      if (left.actionable !== right.actionable) return left.actionable ? -1 : 1;
      return left.uid.localeCompare(right.uid);
    });
  return temp;
}

export async function getPlayerMarketBalancesAction(account: string): Promise<{
  dec: number;
  credits: number;
}> {
  const normalized = normalizeAccount(account);

  const balances = await getCachedSplPlayerBalances(normalized);
  return {
    dec: getTokenBalance(balances, "DEC"),
    credits: getTokenBalance(balances, "CREDITS"),
  };
}

export async function buildMarketplaceAssetPurchasePayloadAction(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  currency: PurchaseCurrency;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  validatePositiveInteger(args.quantity, "Quantity");

  // Live listings + balances for the authoritative pre-broadcast affordability check.
  const [listings, balances] = await Promise.all([
    getMarketplaceAssetListingsAction(args.assetName, args.detailId),
    fetchPlayerBalances(account),
  ]);

  const selection = selectCheapestListings(listings, args.quantity, args.currency, account);
  if (!selection.fulfilled) {
    throw new Error("Not enough listing quantity available for requested purchase");
  }

  const availableBalance = getTokenBalance(balances, args.currency);
  if (availableBalance < selection.totalCost) {
    throw new Error(`Insufficient ${args.currency}`);
  }

  return {
    payload: buildMarketplacePurchasePayload({
      items: selection.items.map((entry) => ({
        listingItemId: entry.listingItemId,
        quantity: entry.quantity,
        currency: args.currency,
        estimatedCost: entry.estimatedCost,
      })),
    }),
    estimatedCost: selection.totalCost,
    availableBalance,
  };
}

// --- Instance / uid based (music, packs, titles, consumables, …) -----------

export async function buildInstanceListPayloadAction(args: {
  account: string;
  assetName: MarketplaceAssetName;
  itemUids: string[];
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  validateUsdPrice(args.priceUsd);

  const itemUids = await resolveActionableUids(account, args.itemUids);

  return {
    payload: buildMarketplaceListPayload({
      assetName: args.assetName,
      entries: itemUids.map((uid) => ({ itemId: uid, quantity: 1 })),
      priceUsd: args.priceUsd,
    }),
    itemUids,
  };
}

export async function buildInstanceTransferPayloadAction(args: {
  account: string;
  recipient: string;
  itemUids: string[];
}) {
  const account = normalizeAccount(args.account);
  const recipient = normalizeRecipient(args.recipient);

  if (!recipient) {
    throw new Error("Recipient is required");
  }
  if (recipient === account) {
    throw new Error("Recipient cannot be the same as the sender");
  }

  const itemUids = await resolveActionableUids(account, args.itemUids);

  return {
    payload: buildTransferItemsPayload({ recipient, itemUids }),
    itemUids,
  };
}

// --- Aggregate / quantity based (skins + fungible tokens) ------------------

async function getOwnedAsset(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<MarketplaceAssetItem> {
  const [assets, playerListings, playerSkins] = await Promise.all([
    getCachedMarketplaceAssets(account, assetName),
    getCachedMarketplacePlayerAllListings(account),
    assetName === "SKINS" ? getCachedPlayerSkins(account) : Promise.resolve([]),
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

  const assetsWithOwnership = applyQuantityOwnership(enrichedAssets, playerListings);
  const owned = assetsWithOwnership.find((entry) => entry.detailId === detailId);
  if (!owned) {
    throw new Error("Item not found for this account");
  }
  return owned;
}

/** The account's own active listings for an asset (used to delist). */
export async function getOwnedListingsAction(
  account: string,
  assetName: MarketplaceAssetName,
  detailId: string
): Promise<Array<{ listingItemId: number; price: number; quantityRemaining: number }>> {
  const normalized = normalizeAccount(account);

  const listings = await fetchMarketplaceListingItems({
    assetName,
    detailIds: [detailId],
    sort: { field: "price", order: "asc" },
  });

  return listings
    .filter((listing) => listing.seller.trim().toLowerCase() === normalized)
    .map((listing) => ({
      listingItemId: listing.listingItemId,
      price: listing.price,
      quantityRemaining: listing.quantityRemaining,
    }));
}

export async function buildQuantityListPayloadAction(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  quantity: number;
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  validatePositiveInteger(args.quantity, "Quantity");
  validateUsdPrice(args.priceUsd);

  const owned = await getOwnedAsset(account, args.assetName, args.detailId);
  const listableQty = getAvailableToListQuantity(owned);

  if (listableQty < args.quantity) {
    throw new Error("Listing quantity exceeds available amount");
  }

  return {
    payload: buildMarketplaceListPayload({
      assetName: args.assetName,
      entries: [{ itemId: args.detailId, quantity: args.quantity }],
      priceUsd: args.priceUsd,
    }),
  };
}

/**
 * Build the payload to activate a skin (`sm_set_skin`).
 * Guard: player must own at least one copy and the skin must not already be active.
 */
export async function buildActivateSkinPayloadAction(args: {
  account: string;
  detailId: string;
  cardDetailId?: number | null;
  skinName?: string | null;
  baseSkin?: boolean;
}) {
  const account = normalizeAccount(args.account);

  if (args.baseSkin) {
    const cardDetailId = validateCardDetailId(args.cardDetailId);
    const playerSkins = await getCachedPlayerSkins(account);
    const activeSkinForCard = playerSkins.find(
      (skin) => skin.card_detail_id === cardDetailId && skin.active
    );

    if (!activeSkinForCard) {
      throw new Error("The base skin is already active");
    }

    return {
      payload: buildSetSkinPayload({
        cardDetailId,
        skin: DEFAULT_SKIN_NAME,
      }),
    };
  }

  const skin = await getOwnedAsset(account, "SKINS", args.detailId);

  if (getActualOwnedQuantity(skin) < 1) {
    throw new Error("You do not own this skin");
  }
  const cardDetailId = validateCardDetailId(skin.cardDetailId);

  if (isSkinActive(skin)) {
    throw new Error("This skin is already active");
  }

  return {
    payload: buildSetSkinPayload({
      cardDetailId,
      skin: args.skinName || skin.activationSkinName || skin.setName || skin.displayName,
    }),
  };
}

export async function buildSkinTransferPayloadAction(args: {
  account: string;
  detailId: string;
  recipient: string;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  const recipient = normalizeRecipient(args.recipient);
  validatePositiveInteger(args.quantity, "Quantity");

  if (!recipient) {
    throw new Error("Recipient is required");
  }
  if (recipient === account) {
    throw new Error("Recipient cannot be the same as the sender");
  }

  const skin = await getOwnedAsset(account, "SKINS", args.detailId);
  if (getActualOwnedQuantity(skin) < args.quantity) {
    throw new Error("Transfer quantity exceeds owned skins");
  }
  if (skin.cardDetailId === null) {
    throw new Error("Skin is missing card metadata required for transfer");
  }

  return {
    payload: buildTransferSkinsPayload({
      recipient,
      skin: skin.setName,
      cardDetailId: skin.cardDetailId,
      quantity: args.quantity,
    }),
  };
}

export async function buildTokenTransferPayloadAction(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  recipient: string;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  const recipient = normalizeRecipient(args.recipient);
  validatePositiveInteger(args.quantity, "Quantity");

  if (!recipient) {
    throw new Error("Recipient is required");
  }
  if (recipient === account) {
    throw new Error("Recipient cannot be the same as the sender");
  }

  const owned = await getOwnedAsset(account, args.assetName, args.detailId);
  if (getActualOwnedQuantity(owned) < args.quantity) {
    throw new Error("Transfer quantity exceeds owned amount");
  }

  // For fungible assets the detailId is the token symbol (e.g. "MIDNIGHTPOT").
  return {
    payload: buildTokenTransferPayload({
      token: args.detailId,
      recipient,
      quantity: args.quantity,
    }),
  };
}

export async function buildDelistAssetPayloadAction(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  listingItemIds: number[];
}) {
  const account = normalizeAccount(args.account);

  if (args.listingItemIds.length === 0) {
    throw new Error("No listings selected to cancel.");
  }

  // Verify each listing is currently active and owned by this account.
  const listings = await fetchMarketplaceListingItems({
    assetName: args.assetName,
    detailIds: [args.detailId],
    sort: { field: "price", order: "asc" },
  });

  const ownListingIds = new Set(
    listings
      .filter((listing) => listing.seller.trim().toLowerCase() === account)
      .map((listing) => listing.listingItemId)
  );
  const listingItemIds = args.listingItemIds.filter((id) => ownListingIds.has(id));

  if (listingItemIds.length < args.listingItemIds.length) {
    throw new Error("Some listings are no longer active or not owned by this account.");
  }

  return {
    payload: buildMarketplaceCancelPayload({ listingItemIds }),
    listingItemIds,
  };
}
