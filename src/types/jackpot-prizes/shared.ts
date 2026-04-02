// Shared types for card-related data across different pages

export interface FoilStats {
  foil: number;
  minted: number;
  total: number;
}

export interface CardPrizeData {
  card_detail_id: number;
  total_minted: number;
  total: number;
  foils: FoilStats[];
}

export interface CardStats {
  mana: number[];
  attack: number[];
  ranged: number[];
  magic: number[];
  armor: number[];
  health: number[];
  speed: number[];
  abilities: string[][];
}

export interface CardDistribution {
  card_detail_id: number;
  gold: boolean;
  foil: number;
  edition: number;
  num_cards: string;
  unbound_cards: string;
  total_xp: string;
  num_burned: string;
  total_burned_xp: string;
}

export interface SplCardDetail {
  id: number;
  name: string;
  color: string;
  type: string;
  sub_type: string;
  rarity: number;
  drop_rate: number;
  stats: CardStats;
  is_starter: boolean;
  editions: string;
  total_printed: number;
  is_promo: boolean;
  stake_type_id: number;
  game_type: string;
  distribution: CardDistribution[];
  tier: number;
}

export interface MintHistoryItem {
  uid: string;
  mint: string;
  mint_player: string;
}

export interface MintHistoryResponse {
  total: number;
  total_minted: number;
  mints: MintHistoryItem[];
}

export interface MintHistoryByDateItem {
  uid: string;
  card_detail_id: number;
  xp: number;
  gold: boolean;
  mint: string;
  mint_player: string | null;
  mint_date: string | null;
  mint_block: number | null;
  mint_tx: string | null;
  guild_name: string | null;
  player_avatar: string | null;
}

export interface MintHistoryByDateResponse {
  mints: MintHistoryByDateItem[];
}

export interface RecentWinner extends MintHistoryByDateItem {
  foil: number;
}
