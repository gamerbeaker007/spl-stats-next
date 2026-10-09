import type { CardFoil, DetailedPlayerCardCollectionItem } from "@/types/card";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";

/** One card + edition + foil row, shared by the card grid and the table. */
export type CardDisplayItem = {
  key: string;
  sourceOrder: number;
  cardItem: DetailedPlayerCardCollectionItem;
  foil: CardFoil;
  highestLevel: number;
  highestCc: number;
  totalCc: number;
  isMissing: boolean;
  imageUrl: string;
  groupCards: NonNullable<DetailedPlayerCardCollectionItem["allCards"]>;
  priceInfo: MarketPriceInfo | undefined;
  watch: CardWatch | undefined;
};
