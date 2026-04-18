import {
  archon_filter_icon_url,
  death_element_icon_url,
  dragon_element_icon_url,
  earth_element_icon_url,
  fire_element_icon_url,
  life_element_icon_url,
  neutral_element_icon_url,
  unit_filter_icon_url,
  water_element_icon_url,
} from "@/lib/staticsIconUrls";

// Edition / set definitions live in edition-utils — re-export for backward compat.
import { CardSetName } from "@/lib/shared/edition-utils";
import { CardRarity } from "@/lib/shared/rarity-utils";
export { cardSetIconMap } from "@/lib/shared/edition-utils";
export {
  cardRarityIconMap as cardIconMap,
  cardRarityOptions,
  RARITY_COLORS,
  RARITY_DEFS,
  RARITY_ORDER,
} from "@/lib/shared/rarity-utils";
export type { CardRarity, RarityDef } from "@/lib/shared/rarity-utils";

export const cardElementOptions = [
  "red",
  "blue",
  "white",
  "black",
  "green",
  "gold",
  "gray",
] as const;
export type CardElement = (typeof cardElementOptions)[number];

export const cardElementIconMap: Record<string, string> = {
  red: fire_element_icon_url,
  blue: water_element_icon_url,
  white: life_element_icon_url,
  black: death_element_icon_url,
  green: earth_element_icon_url,
  gold: dragon_element_icon_url,
  gray: neutral_element_icon_url,
};

export const cardFoilOptions = ["regular", "gold", "gold arcane", "black", "black arcane"] as const;
export type CardFoil = (typeof cardFoilOptions)[number];

export const cardFoilSuffixMap: Record<CardFoil, string> = {
  regular: "",
  gold: "_gold",
  "gold arcane": "_gold",
  black: "_blk",
  "black arcane": "_blk",
};

export const cardRoleOptions = ["archon", "unit"] as const;
export type CardRole = (typeof cardRoleOptions)[number];
export const cardRoleIconMap: Record<CardRole, string> = {
  archon: archon_filter_icon_url,
  unit: unit_filter_icon_url,
};

export interface CardDetail {
  id: number;
  uid: string;
  name: string;
  owner: string;
  xp: number;
  edition: number;
  cardSet: CardSetName;
  collectionPower: number;
  bcx: number;
  setId: string;
  bcxUnbound: number;
  foil: CardFoil;
  mint: string | null;
  level: number;
  imgUrl: string;
}

export interface DetailedPlayerCardCollectionItem {
  cardDetailId: number;
  name: string;
  edition: number;
  tier?: number;
  rarity: CardRarity;
  color: CardElement;
  secondaryColor: CardElement | undefined;
  role: CardRole;
  highestLevelCard?: CardDetail;
  allCards?: CardDetail[];
}

export type DetailedPlayerCardCollection = Record<string, DetailedPlayerCardCollectionItem>;

export interface CardOption {
  cardDetailId: number;
  cardName: string;
}
