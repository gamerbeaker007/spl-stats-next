import type { PurchasePlanItem } from "@/types/purchase/purchase-plan";
import type { SplBalance } from "@/types/spl/balances";
import type { SplCardCollection } from "@/types/spl/card";
import type { CardStats, SplCardDetail } from "@/types/spl/cardDetails";
import type { SplCardListingPriceEntry } from "@/types/spl/market";
import type { SplSettings } from "@/types/spl/season";

export type LeagueBracket = "wood" | "bronze" | "silver" | "gold" | "diamond" | "champion";

export type BracketStatus = "max" | "in-bracket" | "below-bracket";

export interface BuyMissingCcSnapshot {
  account: string;
  cardDetails: SplCardDetail[];
  collection: SplCardCollection;
  groupedMarket: SplCardListingPriceEntry[];
  settings: SplSettings;
  balances: SplBalance[];
}

export interface BuyMissingCcListing {
  marketId: string;
  uid?: string;
  cardDetailId: number;
  edition: number;
  foil: number;
  level: number;
  cc: number;
  priceUsd: number;
  priceDec: number;
  priceCredits: number;
  pricePerCcDec: number;
  seller?: string;
}

export interface UpgradeRequirements {
  targetCc: number;
  missingCc: number;
}

export interface ListingSelection {
  selected: BuyMissingCcListing[];
  totalCc: number;
  totalDec: number;
  totalUsd: number;
  exact: boolean;
}

export interface BuildPurchasePlanInput {
  account: string;
  cardName: string;
  listings: BuyMissingCcListing[];
}

export interface BuildPurchasePlanOutput {
  items: PurchasePlanItem[];
  totals: {
    cc: number;
    dec: number;
    usd: number;
  };
}

export interface TargetLevelPreview {
  currentLevel: number;
  targetLevel: number;
  currentCc: number;
  targetCc: number;
  missingCc: number;
  currentStats: Partial<Record<keyof Omit<CardStats, "abilities">, number>>;
  targetStats: Partial<Record<keyof Omit<CardStats, "abilities">, number>>;
  newAbilities: string[];
}

export interface BuyMissingCcCardContext {
  cardDetailId: number;
  cardName: string;
  rarity: number;
  stats: CardStats;
  edition: number;
  foil: number;
}
