"use server";

import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import {
  fetchPlayerBalances,
  fetchPlayerInventory,
  fetchSplPrices,
} from "@/lib/backend/api/spl/spl-api";
import { fetchMarketplaceListingItems } from "@/lib/backend/api/spl/vapi-spl";
import {
  getCachedMarketplaceAssets,
  getCachedMarketplaceAssetsPublic,
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
  priceSelectionInCurrency,
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
  MarketplacePlayerListing,
  OutbidStatus,
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
  account: string | null,
  assetName: MarketplaceAssetName
): Promise<{
  account: string | null;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  detailedCollection: Awaited<ReturnType<typeof getDetailedPlayerCardCollectionCached>>;
  playerListings: MarketplacePlayerListing[];
  outbidStatuses: OutbidStatus[];
}> {
  const normalized = account ? normalizeAccount(account) : null;

  if (!normalized) {
    const publicItems = await getCachedMarketplaceAssetsPublic(assetName);
    const enrichedPublicItems = publicItems.map((item) => ({
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
      items: enrichedPublicItems,
      groups: groupMarketplaceAssetsByCardDetailId(enrichedPublicItems),
      detailedCollection: {},
      playerListings: [],
      outbidStatuses: [],
    };
  }

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

  const assetListings = playerListings.filter((listing) => listing.assetName === assetName);
  const outbidStatuses = await computeOutbidStatusesForAccount(
    normalized,
    assetName,
    assetListings
  );

  return {
    account: normalized,
    assetName,
    items: enrichedItems,
    groups: groupMarketplaceAssetsByCardDetailId(enrichedItems),
    detailedCollection,
    playerListings: assetListings,
    outbidStatuses,
  };
}

function listingPriceKey(detailId: string, currency: string): string {
  return `${detailId}:${currency}`;
}

/**
 * Build per-detail/currency competing minima from live listing items, excluding
 * the account's own listings by seller name.
 */
async function getLowestCompetingPrices(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailIds: string[];
}): Promise<Map<string, number>> {
  const account = args.account.trim().toLowerCase();

  const perDetailListings = await Promise.all(
    args.detailIds.map((detailId) =>
      fetchMarketplaceListingItems({
        assetName: args.assetName,
        detailIds: [detailId],
        sort: { field: "price", order: "asc" },
      }).catch(() => [])
    )
  );

  const lowestCompeting = new Map<string, number>();

  for (const listings of perDetailListings) {
    for (const listing of listings) {
      if (listing.quantityRemaining < 1 || listing.price <= 0) continue;
      if (listing.seller.trim().toLowerCase() === account) continue;

      const key = listingPriceKey(listing.detailId, listing.currency);
      const existing = lowestCompeting.get(key);
      if (existing === undefined || listing.price < existing) {
        lowestCompeting.set(key, listing.price);
      }
    }
  }

  return lowestCompeting;
}

/**
 * Outbid detection that works for any marketplace asset type with detailId-based
 * listings. Relies on `/market/player/all_listings` for own active listings and
 * `/market/listing-items` for competing prices.
 */
async function computeOutbidStatusesForAccount(
  account: string,
  assetName: MarketplaceAssetName,
  playerListings: MarketplacePlayerListing[]
): Promise<OutbidStatus[]> {
  const activeListings = playerListings.filter(
    (listing) =>
      listing.assetName === assetName &&
      listing.status === 1 &&
      listing.quantityRemaining > 0 &&
      listing.listingPrice > 0
  );

  if (activeListings.length === 0) {
    return [];
  }

  const detailIds = Array.from(new Set(activeListings.map((listing) => listing.detailId)));
  const lowestCompeting = await getLowestCompetingPrices({ account, assetName, detailIds });

  const outbidByDetail = new Map<string, OutbidStatus>();

  for (const listing of activeListings) {
    const competing = lowestCompeting.get(listingPriceKey(listing.detailId, listing.currency));
    if (competing === undefined || competing <= 0) continue;
    if (competing >= listing.listingPrice) continue;

    const existing = outbidByDetail.get(listing.detailId);
    if (!existing || competing < existing.lowestMarketPrice) {
      outbidByDetail.set(listing.detailId, {
        detailId: listing.detailId,
        myPrice: listing.listingPrice,
        currency: listing.currency,
        lowestMarketPrice: competing,
        isOutbid: true,
      });
    }
  }

  return Array.from(outbidByDetail.values());
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

/**
 * Live USD-per-DEC rate from the prices API, used to convert USD listing prices
 * into the DEC amount shown on the buy button and broadcast in the purchase.
 */
export async function getDecPriceUsdAction(): Promise<number> {
  const prices = await fetchSplPrices();
  return prices.dec;
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

  // Live listings + balances + DEC rate for the authoritative pre-broadcast
  // affordability check. The rate is re-read here so the broadcast amount is
  // converted at the current rate, not the one the dialog previewed with.
  const [listings, balances, prices] = await Promise.all([
    getMarketplaceAssetListingsAction(args.assetName, args.detailId),
    fetchPlayerBalances(account),
    fetchSplPrices(),
  ]);

  const selection = selectCheapestListings(listings, args.quantity, account);
  if (!selection.fulfilled) {
    throw new Error("Not enough listing quantity available for requested purchase");
  }

  const priced = priceSelectionInCurrency(selection, args.currency, prices.dec);
  if (!priced) {
    throw new Error(`Could not price this purchase in ${args.currency}`);
  }

  const availableBalance = getTokenBalance(balances, args.currency);
  if (availableBalance < priced.totalCost) {
    throw new Error(`Insufficient ${args.currency}`);
  }

  return {
    payload: buildMarketplacePurchasePayload({ items: priced.items }),
    estimatedCost: priced.totalCost,
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
