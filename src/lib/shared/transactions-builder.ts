import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import type {
  CombineCardsPayload,
  MarketPurchasePayload,
  MarketplaceListPayload,
  MarketplacePurchasePayload,
  TransferSkinsPayload,
} from "@/types/skin-transactions";

export const MARKET = "spl-stats.com";

export function getAppName(): string {
  return splApiConfig.mode === "test" ? `${splApiConfig.app}/dev` : splApiConfig.app;
}

export function getNonce(): number {
  return Date.now();
}

export function normalizeRecipient(recipient: string): string {
  return recipient.trim().toLowerCase();
}

export function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a whole number greater than 0`);
  }
}

export function validateUsdPrice(priceUsd: number): void {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    throw new Error("Price per skin must be greater than 0 USD");
  }
}

export function buildMarketPurchasePayload(args: {
  marketIds: string[];
  currency: PurchaseCurrency;
  totalPrice: number;
}): MarketPurchasePayload {
  if (args.marketIds.length === 0) {
    throw new Error("No listings selected for purchase.");
  }

  if (!Number.isFinite(args.totalPrice) || args.totalPrice <= 0) {
    throw new Error("Total price must be greater than 0");
  }

  return {
    items: args.marketIds,
    currency: args.currency,
    price: Number(args.totalPrice.toFixed(3)),
    market: MARKET,
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildCombineCardsPayload(args: { cardUids: string[] }): CombineCardsPayload {
  if (args.cardUids.length === 0) {
    throw new Error("No cards selected for combining.");
  }

  return {
    cards: args.cardUids,
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildMarketplacePurchasePayload(args: {
  items: Array<{
    listingItemId: number;
    quantity: number;
    currency: PurchaseCurrency;
    estimatedCost: number;
  }>;
}): MarketplacePurchasePayload {
  if (args.items.length === 0) {
    throw new Error("At least one listing item is required");
  }

  for (const item of args.items) {
    validatePositiveInteger(item.quantity, "Quantity");
  }

  return {
    items: args.items,
    market: MARKET,
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildTransferSkinsPayload(args: {
  recipient: string;
  skinIdentifier: string;
  cardDetailId: number;
  quantity: number;
}): TransferSkinsPayload {
  const recipient = normalizeRecipient(args.recipient);
  if (!recipient) {
    throw new Error("Recipient is required");
  }

  validatePositiveInteger(args.quantity, "Quantity");

  return {
    to: recipient,
    skins: [
      {
        skin: args.skinIdentifier,
        card_detail_id: args.cardDetailId,
        qty: args.quantity,
      },
    ],
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildMarketplaceListPayload(args: {
  assetName: MarketplaceAssetName;
  itemId: string;
  quantity: number;
  priceUsd: number;
}): MarketplaceListPayload {
  validatePositiveInteger(args.quantity, "Quantity");

  return {
    assetName: args.assetName,
    currency: "USD",
    items: [
      {
        quantity: args.quantity,
        price: args.priceUsd,
        itemId: args.itemId,
      },
    ],
    market: MARKET,
    app: getAppName(),
    n: getNonce(),
  };
}
