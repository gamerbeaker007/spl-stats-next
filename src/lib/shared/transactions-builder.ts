import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import type {
  CombineCardsPayload,
  MarketPurchasePayload,
  MarketplaceCancelPayload,
  MarketplaceListPayload,
  MarketplacePurchasePayload,
  SetSkinPayload,
  TokenTransferPayload,
  TransferItemsPayload,
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

export function buildTransferItemsPayload(args: {
  recipient: string;
  itemUids: string[];
}): TransferItemsPayload {
  const recipient = normalizeRecipient(args.recipient);
  if (!recipient) {
    throw new Error("Recipient is required");
  }

  if (args.itemUids.length === 0) {
    throw new Error("No items selected for transfer.");
  }

  return {
    items: args.itemUids,
    to: recipient,
    app: getAppName(),
    n: getNonce(),
  };
}

/**
 * `sm_marketplace_list` entries. Skins list one entry `{itemId: detailId, quantity}`;
 * music lists one entry per instance uid `{itemId: uid, quantity: 1}`.
 */
export function buildMarketplaceListPayload(args: {
  assetName: MarketplaceAssetName;
  entries: Array<{ itemId: string; quantity: number }>;
  priceUsd: number;
}): MarketplaceListPayload {
  if (args.entries.length === 0) {
    throw new Error("No items selected for listing.");
  }
  validateUsdPrice(args.priceUsd);
  for (const entry of args.entries) {
    validatePositiveInteger(entry.quantity, "Quantity");
  }

  return {
    assetName: args.assetName,
    currency: "USD",
    items: args.entries.map((entry) => ({
      quantity: entry.quantity,
      price: args.priceUsd,
      itemId: entry.itemId,
    })),
    app: getAppName(),
    n: getNonce(),
  };
}

/**
 * `sm_token_transfer` — transfer a quantity of a fungible token (by symbol) to
 * another player. `memo` mirrors the recipient, matching the Splinterlands client.
 */
export function buildTokenTransferPayload(args: {
  token: string;
  recipient: string;
  quantity: number;
}): TokenTransferPayload {
  const recipient = normalizeRecipient(args.recipient);
  if (!recipient) {
    throw new Error("Recipient is required");
  }
  if (!args.token) {
    throw new Error("Token is required");
  }
  validatePositiveInteger(args.quantity, "Quantity");

  return {
    token: args.token,
    to: recipient,
    qty: args.quantity,
    memo: recipient,
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildTransferSkinsPayload(args: {
  recipient: string;
  skin: string;
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
    skins: [{ skin: args.skin, card_detail_id: args.cardDetailId, qty: args.quantity }],
    app: getAppName(),
    n: getNonce(),
  };
}

export function buildMarketplaceCancelPayload(args: {
  listingItemIds: number[];
}): MarketplaceCancelPayload {
  if (args.listingItemIds.length === 0) {
    throw new Error("No listings selected to cancel.");
  }

  return {
    listingItemIds: args.listingItemIds,
    app: getAppName(),
    n: getNonce(),
  };
}

/** `sm_set_skin` — activates a skin on the given card for the broadcasting account. */
export function buildSetSkinPayload(args: { cardDetailId: number; skin: string }): SetSkinPayload {
  if (!Number.isInteger(args.cardDetailId) || args.cardDetailId < 1) {
    throw new Error("Card detail id is required");
  }
  if (args.skin === undefined || args.skin === null) {
    throw new Error("Skin name is required");
  }

  return {
    card_detail_id: args.cardDetailId,
    skin: args.skin,
    app: getAppName(),
    n: getNonce(),
  };
}
