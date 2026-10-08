export type CardSortField =
  | "default"
  | "name"
  | "rarity"
  | "edition"
  | "foil"
  | "hiLv"
  | "hiCc"
  | "totCc"
  | "priceCc"
  | "oneCc"
  | "listed";

export type CardSortDir = "asc" | "desc";

export type CardSort = { field: CardSortField; dir: CardSortDir };

export const DEFAULT_CARD_SORT: CardSort = { field: "default", dir: "asc" };

export const CARD_SORT_OPTIONS: { value: CardSortField; label: string; needsPrices?: boolean }[] = [
  { value: "default", label: "Card #" },
  { value: "name", label: "Name" },
  { value: "rarity", label: "Rarity" },
  { value: "edition", label: "Edition" },
  { value: "foil", label: "Foil" },
  { value: "hiLv", label: "Highest level" },
  { value: "hiCc", label: "Highest CC" },
  { value: "totCc", label: "Total CC" },
  { value: "priceCc", label: "Price / CC", needsPrices: true },
  { value: "oneCc", label: "1 CC price", needsPrices: true },
  { value: "listed", label: "Listed", needsPrices: true },
];

export function isPriceSort(field: CardSortField): boolean {
  return CARD_SORT_OPTIONS.some((o) => o.value === field && o.needsPrices);
}
