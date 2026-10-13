import type { MarketPriceInfo, SplCardListingPriceEntry } from "@/types/spl/market";

/**
 * Grouped market entries (`/market/for_sale_grouped`) collapsed to the lowest
 * prices per `${cardDetailId}-${edition}-${foilInt}` (the API splits by level).
 */
export function toMarketPriceMap(
  entries: SplCardListingPriceEntry[]
): Record<string, MarketPriceInfo> {
  const result: Record<string, MarketPriceInfo> = {};
  for (const entry of entries) {
    const lpBcx = Number(entry.low_price_bcx) || 0;
    const lp = Number(entry.low_price) || 0;
    const qty = Number(entry.qty) || 0;
    const key = `${entry.card_detail_id}-${entry.edition}-${entry.foil}`;
    const existing = result[key];
    if (!existing) {
      result[key] = { qty, lowPriceBcx: lpBcx, lowPrice: lp };
    } else {
      existing.qty += qty;
      if (lpBcx > 0 && (existing.lowPriceBcx === 0 || lpBcx < existing.lowPriceBcx))
        existing.lowPriceBcx = lpBcx;
      if (lp > 0 && (existing.lowPrice === 0 || lp < existing.lowPrice)) existing.lowPrice = lp;
    }
  }
  return result;
}
