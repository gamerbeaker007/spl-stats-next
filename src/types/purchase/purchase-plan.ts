import { CardFoil } from "@/types/card";
import type { LandRarity, LandTerrain, LandType } from "@/types/land/landMarket";

export type PurchaseCurrency = "DEC" | "CREDITS";

/** Fields every cart item carries, whatever is being bought. */
interface PurchasePlanItemBase {
  /** Buying account. */
  account: string;
  /** Unique cart key for the listing (dedupe + removal). */
  marketId: string;
  priceUsd: number;
  priceDec: number;
  priceCredits: number;
  seller?: string;
}

/** A card listing — bought with `sm_market_purchase`. `kind` is optional for back-compat. */
export interface CardPurchasePlanItem extends PurchasePlanItemBase {
  kind?: "card";
  uid?: string;
  cardDetailId: number;
  cardName: string;
  edition: number;
  foil: CardFoil;
  level: number;
  cc: number;
}

/**
 * A land deed listing — bought with `sm_marketplace_purchase`. Always quantity 1
 * (each deed is unique). `marketId` is `land:<listingItemId>` so it can never
 * collide with a card market id.
 */
export interface LandPurchasePlanItem extends PurchasePlanItemBase {
  kind: "land";
  /** `market_id` from the deeds API — the purchase `listingItemId`. */
  listingItemId: number;
  /** DEEDS marketplace detail id (`item_detail_id`). */
  detailId: number;
  deedUid: string;
  location: string;
  regionName: string;
  rarity: LandRarity | null;
  terrain: LandTerrain | null;
  landType: LandType | null;
  imageUrl: string;
}

export type PurchasePlanItem = CardPurchasePlanItem | LandPurchasePlanItem;

export function isLandPurchaseItem(item: PurchasePlanItem): item is LandPurchasePlanItem {
  return item.kind === "land";
}

export function isCardPurchaseItem(item: PurchasePlanItem): item is CardPurchasePlanItem {
  return item.kind !== "land";
}

export function landCartMarketId(listingItemId: number): string {
  return `land:${listingItemId}`;
}

export interface MarketListingCard {
  card_detail_id: number;
  level?: number;
  xp?: number;
  edition?: number;
  foil?: number;
  player?: string;
  bcx?: number;
}

export interface SplMarketListing {
  market_id: string;
  uid?: string;
  card_detail_id: number;
  edition: number;
  foil: number;
  bcx: number;
  level: number;
  buy_price: number;
  buy_price_credits?: number;
  seller?: string;
  currency?: PurchaseCurrency;
  card?: MarketListingCard;
}

export interface SplMarketListingsResponse {
  data?: SplMarketListing[];
}

export interface FetchMarketListingsByCardParams {
  cardDetailId: number;
  foil: CardFoil;
  edition: number;
  type?: "buy";
  level?: number;
}

export interface LookupTransactionStatus {
  ok: boolean;
  resolved: boolean;
  success: boolean;
  message?: string;
  type?: string;
  raw?: SplTransactionLookupResponse;
}

export interface WaitForTransactionsResult {
  txId: string;
  status: LookupTransactionStatus;
}

export interface SplTransactionLookupInfo {
  id: string;
  type: string;
  player: string;
  data: string;
  result: string | null;
  success?: boolean;
  failed?: boolean;
  error?: string | null;
  message?: string | null;
  created_date?: string | null;
}

export interface SplTransactionLookupResponse {
  trx_info: SplTransactionLookupInfo;
}

/**
 * A confirmed `sm_token_transfer`, read back off the SPL engine. These are the
 * facts a caller is allowed to act on — never what the browser claimed it sent.
 */
export interface TokenTransferLookupData {
  from: string;
  to: string;
  /** The symbol the engine confirms ("DEC", "SPS", ...), not the one requested. */
  token: string;
  amount: number;
  /** When the engine settled the transfer; falls back to the envelope date. */
  date: Date;
}

export type TokenTransferLookup =
  | { status: "success"; transfer: TokenTransferLookupData }
  /** Not indexed yet, or still without a result — safe to retry. */
  | { status: "pending" }
  /** Rejected, malformed, or not a token transfer at all — never retry. */
  | { status: "failed"; error: string };
