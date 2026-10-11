export type SplCardListingPriceEntry = {
  card_detail_id: number;
  gold: boolean;
  foil: number;
  edition: number;
  qty: number;
  level: number;
  low_price_bcx: number;
  low_price: number;
  high_price: number;
  mana: number;
  season_qty: number;
  daily_qty: number;
};

/** Market prices keyed by `${cardDetailId}-${edition}-${foilInt}`. */
export type MarketPriceInfo = { qty: number; lowPriceBcx: number; lowPrice: number };
