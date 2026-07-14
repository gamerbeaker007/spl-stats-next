import type { MarketplaceAssetName } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";

export interface MarketPurchasePayload {
  items: string[];
  currency: PurchaseCurrency;
  price: number;
  market: string;
  app: string;
  n: number;
}

export interface CombineCardsPayload {
  cards: string[];
  app: string;
  n: number;
}

export interface MarketplacePurchasePayload {
  items: Array<{
    listingItemId: number;
    quantity: number;
    currency: PurchaseCurrency;
    estimatedCost: number;
  }>;
  market: string;
  app: string;
  n: number;
}

/**
 * Instance-based transfer (`sm_transfer_items`) — moves specific owned copies by
 * uid. Used for MUSIC (and other inventory items with per-copy uids).
 */
export interface TransferItemsPayload {
  items: string[];
  to: string;
  app: string;
  n: number;
}

/**
 * Skin transfer (`sm_transfer_skins`) — quantity-based per (skin set, card).
 * Skins have no per-copy uids, so they transfer by count.
 */
export interface TransferSkinsPayload {
  to: string;
  skins: Array<{
    skin: string;
    card_detail_id: number;
    qty: number;
  }>;
  app: string;
  n: number;
}

/**
 * Fungible token transfer (`sm_token_transfer`) — moves a quantity of a fungible
 * asset (packs, consumables, totem fragments, land resources) by its token symbol.
 */
export interface TokenTransferPayload {
  token: string;
  to: string;
  qty: number;
  memo: string;
  app: string;
  n: number;
}

export interface MarketplaceListPayload {
  assetName: MarketplaceAssetName;
  currency: "USD";
  items: Array<{
    quantity: number;
    price: number;
    itemId: string;
  }>;
  app: string;
  n: number;
}

/** Cancel (delist) marketplace listings by their listing item ids (`sm_marketplace_cancel`). */
export interface MarketplaceCancelPayload {
  listingItemIds: number[];
  app: string;
  n: number;
}
