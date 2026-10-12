"use client";

import {
  getDecPriceUsdAction,
  getOwnedAssetAction,
  getPlayerSkinsAction,
} from "@/lib/backend/actions/marketplace-assets-actions";
import {
  fetchAccountBalances,
  fetchDeedListingsPage,
  fetchInventory,
  fetchMarketplaceAssetListings,
} from "@/lib/frontend/spl-browser-api";
import {
  type LandPurchasePayloadResult,
  type LandPurchaseRequestItem,
  buildLandPurchase,
  validateLandPurchaseRequest,
} from "@/lib/shared/land-purchase";
import {
  DEFAULT_SKIN_NAME,
  assertActionableUids,
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  isSkinActive,
  listingsBySeller,
  selectCheapestListings,
} from "@/lib/shared/marketplace-assets";
import { buildPricedMarketplacePurchase } from "@/lib/shared/marketplace-purchase";
import {
  buildMarketplaceCancelPayload,
  buildMarketplaceListPayload,
  buildSetSkinPayload,
  buildTokenTransferPayload as buildSmTokenTransferPayload,
  buildTransferItemsPayload,
  buildTransferSkinsPayload,
  normalizeRecipient,
  validatePositiveInteger,
  validateUsdPrice,
} from "@/lib/shared/transactions-builder";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";

/**
 * Pre-broadcast payload builders, run in the browser.
 *
 * Each one re-checks the action against current data and builds the
 * `custom_json` payload the account then signs with Keychain. The checks are a
 * UX pre-flight (fail early with a clear message): SPL validates the signed tx
 * itself — balance, listing state, ownership, and the DEC rate within
 * `dec_mismatch_percent`. Data comes from each data type's single path:
 * live data (balances, inventory, listings) via `spl-browser-api.ts`, cached
 * data (DEC rate, owned holdings, skins) via Server Actions.
 */

function normalizeAccount(account: string): string {
  const normalized = account.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Account is required");
  }
  return normalized;
}

function validateRecipient(recipient: string, account: string): string {
  const normalized = normalizeRecipient(recipient);
  if (!normalized) {
    throw new Error("Recipient is required");
  }
  if (normalized === account) {
    throw new Error("Recipient cannot be the same as the sender");
  }
  return normalized;
}

function validateCardDetailId(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("Skin is missing card metadata required for activation");
  }
  return value;
}

// --- Purchases --------------------------------------------------------------

export async function buildLandPurchasePayload(args: {
  account: string;
  currency: PurchaseCurrency;
  items: LandPurchaseRequestItem[];
}): Promise<LandPurchasePayloadResult> {
  const account = normalizeAccount(args.account);
  const detailIds = validateLandPurchaseRequest(args.currency, args.items);

  const [listingPage, balances, decPriceUsd] = await Promise.all([
    fetchDeedListingsPage(detailIds),
    fetchAccountBalances(account),
    getDecPriceUsdAction(),
  ]);

  return buildLandPurchase({
    account,
    currency: args.currency,
    items: args.items,
    listingPage,
    balances,
    decPriceUsd,
  });
}

export async function buildMarketplaceAssetPurchasePayload(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  currency: PurchaseCurrency;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  validatePositiveInteger(args.quantity, "Quantity");

  const [listings, balances, decPriceUsd] = await Promise.all([
    fetchMarketplaceAssetListings(args.assetName, args.detailId),
    fetchAccountBalances(account),
    getDecPriceUsdAction(),
  ]);

  const selection = selectCheapestListings(listings, args.quantity, account);
  if (!selection.fulfilled) {
    throw new Error("Not enough listing quantity available for requested purchase");
  }

  return buildPricedMarketplacePurchase({
    selection,
    currency: args.currency,
    decPriceUsd,
    balances,
  });
}

// --- Instance / uid based (music, packs, titles, consumables, …) -----------

export async function buildInstanceListPayload(args: {
  account: string;
  assetName: MarketplaceAssetName;
  itemUids: string[];
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  validateUsdPrice(args.priceUsd);

  const itemUids = assertActionableUids(await fetchInventory(account), args.itemUids);

  return {
    payload: buildMarketplaceListPayload({
      assetName: args.assetName,
      entries: itemUids.map((uid) => ({ itemId: uid, quantity: 1 })),
      priceUsd: args.priceUsd,
    }),
    itemUids,
  };
}

export async function buildInstanceTransferPayload(args: {
  account: string;
  recipient: string;
  itemUids: string[];
}) {
  const account = normalizeAccount(args.account);
  const recipient = validateRecipient(args.recipient, account);

  const itemUids = assertActionableUids(await fetchInventory(account), args.itemUids);

  return {
    payload: buildTransferItemsPayload({ recipient, itemUids }),
    itemUids,
  };
}

// --- Aggregate / quantity based (skins + fungible tokens) ------------------

export async function buildQuantityListPayload(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  quantity: number;
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  validatePositiveInteger(args.quantity, "Quantity");
  validateUsdPrice(args.priceUsd);

  const owned = await getOwnedAssetAction(account, args.assetName, args.detailId);
  if (getAvailableToListQuantity(owned) < args.quantity) {
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
export async function buildActivateSkinPayload(args: {
  account: string;
  detailId: string;
  cardDetailId?: number | null;
  skinName?: string | null;
  baseSkin?: boolean;
}) {
  const account = normalizeAccount(args.account);

  if (args.baseSkin) {
    const cardDetailId = validateCardDetailId(args.cardDetailId);
    const playerSkins = await getPlayerSkinsAction(account);
    const activeSkinForCard = playerSkins.find(
      (skin) => skin.card_detail_id === cardDetailId && skin.active
    );

    if (!activeSkinForCard) {
      throw new Error("The base skin is already active");
    }

    return {
      payload: buildSetSkinPayload({ cardDetailId, skin: DEFAULT_SKIN_NAME }),
    };
  }

  const skin = await getOwnedAssetAction(account, "SKINS", args.detailId);

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

export async function buildSkinTransferPayload(args: {
  account: string;
  detailId: string;
  recipient: string;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  const recipient = validateRecipient(args.recipient, account);
  validatePositiveInteger(args.quantity, "Quantity");

  const skin = await getOwnedAssetAction(account, "SKINS", args.detailId);
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

export async function buildTokenTransferPayload(args: {
  account: string;
  assetName: MarketplaceAssetName;
  detailId: string;
  recipient: string;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  const recipient = validateRecipient(args.recipient, account);
  validatePositiveInteger(args.quantity, "Quantity");

  const owned = await getOwnedAssetAction(account, args.assetName, args.detailId);
  if (getActualOwnedQuantity(owned) < args.quantity) {
    throw new Error("Transfer quantity exceeds owned amount");
  }

  // For fungible assets the detailId is the token symbol (e.g. "MIDNIGHTPOT").
  return {
    payload: buildSmTokenTransferPayload({
      token: args.detailId,
      recipient,
      quantity: args.quantity,
    }),
  };
}

export async function buildDelistAssetPayload(args: {
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
  const listings = await fetchMarketplaceAssetListings(args.assetName, args.detailId);
  const ownListingIds = new Set(
    listingsBySeller(listings, account).map((listing) => listing.listingItemId)
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
