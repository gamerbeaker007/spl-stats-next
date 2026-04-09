export interface PKPrice {
  id: number;
  card_detail_id: number;
  edition: number;
  gold: boolean;
  foil: number;
  last_bcx_price: number;
  last_sell_price: number;
  last_bcx: string;
  last_block_num: string;
  prev_bcx_price: number;
  prev_sell_price: number;
  prev_bcx: string;
  prev_block_num: string;
}

export interface PKPricesResponse {
  prices: PKPrice[];
}

export interface PKBid {
  id: number;
  bcx: number;
  createdAt: number;
  asset: string;
  usd_price: number;
  remaining_qty: number;
  // present only on card bids
  card_detail_id?: number;
  edition?: number;
  gold?: boolean;
  foil?: number;
  rarity?: number | null;
}

export interface PKBidsResponse {
  bids: PKBid[];
}
