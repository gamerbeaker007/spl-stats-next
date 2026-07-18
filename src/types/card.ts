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
import type { CardStats } from "@/types/spl/cardDetails";
export { cardSetIconMap } from "@/lib/shared/edition-utils";
export {
  cardRarityOptions,
  RARITY_COLORS,
  RARITY_DEFS,
  RARITY_ORDER,
} from "@/lib/shared/rarity-utils";
export type { CardRarity, RarityDef } from "@/lib/shared/rarity-utils";

export const cardColorOptions = ["red", "blue", "white", "black", "green", "gold", "gray"] as const;
export type CardColor = (typeof cardColorOptions)[number];

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

export const cardRoleOptions = ["archon", "unit"] as const;
export type CardRole = (typeof cardRoleOptions)[number];

export const cardRoleLabelMap: Record<CardRole, string> = {
  archon: "Archon",
  unit: "Unit",
};

export const cardRoleIconMap: Record<CardRole, string> = {
  archon: archon_filter_icon_url,
  unit: unit_filter_icon_url,
};

export function toCardRole(cardType?: string | null): CardRole {
  const normalized = cardType?.trim().toLowerCase();
  return normalized === "summoner" || normalized === "archon" ? "archon" : "unit";
}

export interface CardDetail {
  id: number;
  uid: string;
  owner: string;
  delegatedTo?: string | null;
  xp: number;
  edition: number;
  cardSet: CardSetName;
  collectionPower: number;
  bcx: number;
  bcxUnbound: number;
  foil: CardFoil;
  mint: string | null;
  level: number;
  onWagon: boolean;
  onLand: boolean;
  inSet: boolean;
  listed: boolean;
  imgUrl: string;
}

export interface DetailedPlayerCardCollectionItem {
  cardDetailId: number;
  name: string;
  edition: number;
  tier: number;
  rarity: CardRarity;
  color: CardColor;
  secondaryColor: CardColor | undefined;
  role: CardRole;
  /** Foils this card was printed in for this edition (derived from the API distribution). */
  availableFoils: CardFoil[];
  highestLevelCard?: CardDetail;
  cardStats: CardStats;
  allCards?: CardDetail[]; // list of all the card a player has
}

export type DetailedPlayerCardCollection = Record<string, DetailedPlayerCardCollectionItem>;

export interface CardOption {
  cardDetailId: number;
  cardName: string;
}
