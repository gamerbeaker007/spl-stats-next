import { CardFoil } from "@/types/card";

export type PurchaseCurrency = "DEC" | "CREDITS";

export interface PurchasePlanItem {
  account: string;
  marketId: string;
  uid?: string;
  cardDetailId: number;
  cardName: string;
  edition: number;
  foil: CardFoil;
  level: number;
  cc: number;
  priceUsd: number;
  priceDec: number;
  priceCredits: number;
  seller?: string;
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
}

export interface SplTransactionLookupResponse {
  trx_info: SplTransactionLookupInfo;
}
