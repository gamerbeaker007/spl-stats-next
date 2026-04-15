/** Foil bucketed into 3 display categories for filter UI. */
export type FoilCategory = "regular" | "gold" | "black";

/**
 * One flattened row from the cards/get_details distribution array,
 * with BCX and CP computed server-side.
 */
export interface CardDistributionRow {
  cardDetailId: number;
  name: string;
  /** 1=Common, 2=Rare, 3=Epic, 4=Legendary */
  rarity: number;
  rarityName: string;
  tier: number | null;
  edition: number;
  editionLabel: string;
  /** Numeric foil: 0=Regular, 1=Gold, 2=Gold Arcane, 3=Black, 4=Black Arcane */
  foil: number;
  foilLabel: string;
  foilCategory: FoilCategory;
  /** Element colour as returned by the API, e.g. "Red", "Blue", "Gold". */
  color: string;
  /** Secondary element colour, or undefined. */
  secondaryColor: string | undefined;
  /** Card role: "Monster" | "Summoner" */
  role: string;
  numCards: number;
  numBurned: number;
  unboundCards: number;
  bcx: number;
  burnedBcx: number;
  cp: number;
}
