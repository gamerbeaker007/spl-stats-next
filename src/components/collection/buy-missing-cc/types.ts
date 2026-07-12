import type { DetailedPlayerCardCollectionItem, CardFoil } from "@/types/card";

export type BracketTableState = "all" | "below" | "in-bracket" | "max";

export type BuyMissingCcSortField = "name" | "owned" | "next" | "bracket" | "1bcx" | "max" | "cc";

export type AccountCardState = {
  highestLevel: number;
  highestCc: number;
  totalCc: number;
};

export type Row = DetailedPlayerCardCollectionItem & {
  key: string;
  foil: CardFoil;
  accountStates: Record<string, AccountCardState>;
  lowPricePerBcxUsd: number | null;
  lowPriceUsd: number | null;
};

export type DisplayRow = Row & {
  highestOwnedLevel: number;
  highestOwnedCc: number;
  totalOwnedCc: number;
};
