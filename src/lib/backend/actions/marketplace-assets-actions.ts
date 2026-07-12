"use server";

import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { fetchPlayerBalances } from "@/lib/backend/api/spl/spl-api";
import {
  fetchMarketplaceAssetMeta,
  fetchMarketplaceListingItems,
  fetchMarketplaceSkins,
} from "@/lib/backend/api/spl/vapi-spl";
import { getDetailedPlayerCardCollectionCached } from "@/lib/backend/services/collection-detailed";
import { groupMarketplaceSkinsByCardDetailId } from "@/lib/shared/marketplace-assets";
import {
  buildMarketplaceListPayload,
  buildMarketplacePurchasePayload,
  buildTransferSkinsPayload,
  normalizeRecipient,
  validatePositiveInteger,
  validateUsdPrice,
} from "@/lib/shared/transactions-builder";
import type {
  MarketplaceListingItem,
  MarketplaceSkinGroup,
  MarketplaceSkinItem,
} from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";

function normalizeAccount(account: string): string {
  return account.trim().toLowerCase();
}

function toUnitPrice(listing: MarketplaceListingItem, currency: PurchaseCurrency): number | null {
  if (currency === "DEC") return listing.priceDec;
  if (currency === "CREDITS") return listing.priceCredits;
  return null;
}

function selectCheapestListings(
  listings: MarketplaceListingItem[],
  quantity: number,
  currency: PurchaseCurrency,
  buyerAccount: string
): Array<{ listing: MarketplaceListingItem; quantity: number; estimatedCost: number }> {
  const sorted = listings
    .filter((listing) => {
      const unitPrice = toUnitPrice(listing, currency);
      const isOwnListing = normalizeAccount(listing.seller) === buyerAccount;
      return unitPrice !== null && listing.quantityRemaining > 0 && !isOwnListing;
    })
    .sort((left, right) => {
      const leftUnitPrice = toUnitPrice(left, currency) ?? Number.MAX_SAFE_INTEGER;
      const rightUnitPrice = toUnitPrice(right, currency) ?? Number.MAX_SAFE_INTEGER;
      return leftUnitPrice - rightUnitPrice;
    });

  const chosen: Array<{
    listing: MarketplaceListingItem;
    quantity: number;
    estimatedCost: number;
  }> = [];
  let remaining = quantity;

  for (const listing of sorted) {
    if (remaining <= 0) break;
    const buyQuantity = Math.min(remaining, listing.quantityRemaining);
    const unitPrice = toUnitPrice(listing, currency);

    if (unitPrice === null || buyQuantity < 1) continue;

    const estimatedCost = Number((unitPrice * buyQuantity).toFixed(3));
    chosen.push({ listing, quantity: buyQuantity, estimatedCost });
    remaining -= buyQuantity;
  }

  if (remaining > 0) {
    throw new Error("Not enough listing quantity available for requested purchase");
  }

  return chosen;
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

async function getOwnedSkin(
  account: string,
  detailId: string
): Promise<MarketplaceSkinItem | null> {
  const skins = await fetchMarketplaceSkins(account);
  return skins.find((skin) => skin.detailId === detailId) ?? null;
}

async function getSkinMeta(detailId: string) {
  const details = await fetchMarketplaceAssetMeta("SKINS", [detailId]);
  return details[0] ?? null;
}

export async function getMarketplaceSkinsPageDataAction(account: string): Promise<{
  account: string;
  skins: MarketplaceSkinItem[];
  groups: MarketplaceSkinGroup[];
  detailedCollection: Awaited<ReturnType<typeof getDetailedPlayerCardCollectionCached>>;
}> {
  const normalized = normalizeAccount(account);
  await assertMonitorsAccount(normalized);

  const [skins, detailedCollection] = await Promise.all([
    fetchMarketplaceSkins(normalized),
    getDetailedPlayerCardCollectionCached(normalized),
  ]);

  return {
    account: normalized,
    skins,
    groups: groupMarketplaceSkinsByCardDetailId(skins),
    detailedCollection,
  };
}

export async function getMarketplaceSkinListingsAction(
  detailId: string
): Promise<MarketplaceListingItem[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not logged in");
  }

  return fetchMarketplaceListingItems({
    assetName: "SKINS",
    detailIds: [detailId],
    sort: { field: "price", order: "asc" },
  });
}

export async function buildMarketplaceSkinPurchasePayloadAction(args: {
  account: string;
  detailId: string;
  currency: PurchaseCurrency;
  quantity: number;
}) {
  const account = normalizeAccount(args.account);
  await assertMonitorsAccount(account);
  validatePositiveInteger(args.quantity, "Quantity");

  const [listings, balances] = await Promise.all([
    getMarketplaceSkinListingsAction(args.detailId),
    fetchPlayerBalances(account),
  ]);

  const selectedListings = selectCheapestListings(listings, args.quantity, args.currency, account);
  const estimatedCost = Number(
    selectedListings.reduce((sum, entry) => sum + entry.estimatedCost, 0).toFixed(3)
  );
  const availableBalance = getTokenBalance(balances, args.currency);

  if (availableBalance < estimatedCost) {
    throw new Error(`Insufficient ${args.currency}`);
  }

  return {
    payload: buildMarketplacePurchasePayload({
      items: selectedListings.map((entry) => ({
        listingItemId: entry.listing.listingItemId,
        quantity: entry.quantity,
        currency: args.currency,
        estimatedCost: entry.estimatedCost,
      })),
    }),
    selectedListings,
    estimatedCost,
    availableBalance,
  };
}

export async function getMarketplaceSkinBalancesAction(account: string): Promise<{
  dec: number;
  credits: number;
}> {
  const normalized = normalizeAccount(account);
  await assertMonitorsAccount(normalized);

  const balances = await fetchPlayerBalances(normalized);
  return {
    dec: getTokenBalance(balances, "DEC"),
    credits: getTokenBalance(balances, "CREDITS"),
  };
}

export async function buildTransferSkinPayloadAction(args: {
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

  const [ownedSkin, meta] = await Promise.all([
    getOwnedSkin(account, args.detailId),
    getSkinMeta(args.detailId),
  ]);

  if (!ownedSkin || ownedSkin.numOwned < args.quantity) {
    throw new Error("Transfer quantity exceeds owned skins");
  }

  if (!meta?.cardDetailId || !meta.set) {
    throw new Error("Missing skin metadata required for transfer");
  }

  return {
    payload: buildTransferSkinsPayload({
      recipient,
      skinIdentifier: meta.set,
      cardDetailId: meta.cardDetailId,
      quantity: args.quantity,
    }),
    ownedSkin,
  };
}

export async function buildMarketplaceSkinListPayloadAction(args: {
  account: string;
  detailId: string;
  quantity: number;
  priceUsd: number;
}) {
  const account = normalizeAccount(args.account);
  await assertMonitorsAccount(account);
  validatePositiveInteger(args.quantity, "Quantity");
  validateUsdPrice(args.priceUsd);

  const [ownedSkin, meta] = await Promise.all([
    getOwnedSkin(account, args.detailId),
    getSkinMeta(args.detailId),
  ]);

  if (!ownedSkin || ownedSkin.numOwned < args.quantity) {
    throw new Error("Listing quantity exceeds owned skins");
  }

  if (!meta) {
    throw new Error("Missing skin metadata required for listing");
  }

  return {
    payload: buildMarketplaceListPayload({
      assetName: "SKINS",
      itemId: meta.id,
      quantity: args.quantity,
      priceUsd: args.priceUsd,
    }),
    ownedSkin,
  };
}
