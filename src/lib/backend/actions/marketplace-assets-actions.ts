"use server";

import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { fetchPlayerBalances, fetchPlayerInventory } from "@/lib/backend/api/spl/spl-api";
import { fetchMarketplaceListingItems } from "@/lib/backend/api/spl/vapi-spl";
import {
  getCachedMarketplaceAssets,
  getCachedSplPlayerBalances,
  getCachedSplPlayerInventory,
} from "@/lib/backend/cache/spl-cache";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import {
  groupMarketplaceAssetsByCardDetailId,
  isActionableInventoryItem,
  selectCheapestListings,
} from "@/lib/shared/marketplace-assets";
import {
  buildMarketplaceCancelPayload,
  buildMarketplaceListPayload,
  buildMarketplacePurchasePayload,
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

async function assertMonitorsAccount(account: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not logged in");
  }

  const monitoredAccounts = await getMonitoredAccounts();
  if (!monitoredAccounts.some((entry) => entry.username === account)) {
    throw new Error("Account not in your monitored list");
  }
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

  const [items, detailedCollection] = await Promise.all([
    getCachedMarketplaceAssets(normalized, assetName),
    getDetailedPlayerCardCollectionCached(normalized),
  ]);

  return {
    account: normalized,
    assetName,
    items,
    groups: groupMarketplaceAssetsByCardDetailId(items),
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

  const detailIdNumber = Number(detailId);
  const temp = inventory
    .filter((item) => item.item_detail_id === detailIdNumber)
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
  await assertMonitorsAccount(account);
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

// --- Music (instance / uid based) -----------------------------------------

export async function buildMusicListPayloadAction(args: {
  account: string;
  itemUids: string[];
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  await assertMonitorsAccount(account);
  validateUsdPrice(args.priceUsd);

  const itemUids = await resolveActionableUids(account, args.itemUids);

  return {
    payload: buildMarketplaceListPayload({
      assetName: "MUSIC",
      entries: itemUids.map((uid) => ({ itemId: uid, quantity: 1 })),
      priceUsd: args.priceUsd,
    }),
    itemUids,
  };
}

export async function buildMusicTransferPayloadAction(args: {
  account: string;
  recipient: string;
  itemUids: string[];
}) {
  const account = normalizeAccount(args.account);
  await assertMonitorsAccount(account);
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

// --- Skins (aggregate / quantity based) ------------------------------------

async function getOwnedSkin(account: string, detailId: string): Promise<MarketplaceAssetItem> {
  const skins = await getCachedMarketplaceAssets(account, "SKINS");
  const skin = skins.find((entry) => entry.detailId === detailId);
  if (!skin) {
    throw new Error("Skin not found for this account");
  }
  return skin;
}

/** The account's own active listings for a skin (used to delist). */
export async function getOwnedSkinListingsAction(
  account: string,
  detailId: string
): Promise<Array<{ listingItemId: number; price: number; quantityRemaining: number }>> {
  const normalized = normalizeAccount(account);

  const listings = await fetchMarketplaceListingItems({
    assetName: "SKINS",
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

export async function buildSkinListPayloadAction(args: {
  account: string;
  detailId: string;
  quantity: number;
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  await assertMonitorsAccount(account);
  validatePositiveInteger(args.quantity, "Quantity");
  validateUsdPrice(args.priceUsd);

  const skin = await getOwnedSkin(account, args.detailId);
  if (skin.numOwned < args.quantity) {
    throw new Error("Listing quantity exceeds owned skins");
  }

  return {
    payload: buildMarketplaceListPayload({
      assetName: "SKINS",
      entries: [{ itemId: args.detailId, quantity: args.quantity }],
      priceUsd: args.priceUsd,
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
  await assertMonitorsAccount(account);
  const recipient = normalizeRecipient(args.recipient);
  validatePositiveInteger(args.quantity, "Quantity");

  if (!recipient) {
    throw new Error("Recipient is required");
  }
  if (recipient === account) {
    throw new Error("Recipient cannot be the same as the sender");
  }

  const skin = await getOwnedSkin(account, args.detailId);
  if (skin.numOwned < args.quantity) {
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
