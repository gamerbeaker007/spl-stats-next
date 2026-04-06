import {
  archon_filter_icon_url,
  card_rarity_common_icon_url,
  card_rarity_epic_icon_url,
  card_rarity_legendary_icon_url,
  card_rarity_rare_icon_url,
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
import { SET_NAMES, type SetName } from "@/lib/shared/edition-utils";
export type { EditionDef, SetDef, SetName } from "@/lib/shared/edition-utils";
export { cardSetIconMap } from "@/lib/shared/edition-utils";
// CardSetName kept as string for backward compat (original behavior).
// New code should use SetName from edition-utils for the strict union.
export type CardSetName = string;
// Mutable copy so components expecting a mutable array are satisfied.
export const cardSetOptions: SetName[] = [...SET_NAMES];

export const cardRarityOptions = ["common", "rare", "epic", "legendary"];
export type CardRarity = (typeof cardRarityOptions)[number];
export const cardIconMap: Record<CardRarity, string> = {
  common: card_rarity_common_icon_url,
  rare: card_rarity_rare_icon_url,
  epic: card_rarity_epic_icon_url,
  legendary: card_rarity_legendary_icon_url,
};

export const cardElementOptions = ["red", "blue", "white", "black", "green", "gold", "gray"];
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

export const cardFoilOptions = ["regular", "gold", "gold arcane", "black", "black arcane"];
export type CardFoil = (typeof cardFoilOptions)[number];

export const cardFoilSuffixMap: Record<CardFoil, string> = {
  regular: "",
  gold: "_gold",
  "gold arcane": "_gold",
  black: "_blk",
  "black arcane": "_blk",
};

export const cardRoleOptions = ["archon", "unit"];
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
