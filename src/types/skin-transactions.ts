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

export interface MarketplaceListPayload {
  assetName: MarketplaceAssetName;
  currency: "USD";
  items: Array<{
    quantity: number;
    price: number;
    itemId: string;
  }>;
  market: string;
  app: string;
  n: number;
}
