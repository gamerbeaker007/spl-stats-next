/**
 * Raw SPL API types used for jackpot prize data
 */

export interface SplPlayerCardDetail {
  card_detail_id: number;
  player: string;
  uid: string;
  xp: number;
  gold: boolean;
  edition: number;
  card_set: string;
  collection_power: number;
  bcx: number;
  bcx_unbound: number;
  foil: number;
  mint: string | null;
  level: number;
}

export interface SplPlayerCollection {
  player: string;
  cards: SplPlayerCardDetail[];
}

export interface SplInventoryItem {
  uid: string;
  item_detail_id: number;
  player: string;
  created_date: string;
  created_tx: string;
  created_block_num: number;
  in_use: boolean;
  lock_days: number | null;
  unlock_date: string | null;
  unlock_tx: string | null;
  listed: boolean;
  stake_start_date: string | null;
  stake_end_date: string | null;
  boost: string | null;
  stake_plot: string | null;
  stake_region: string | null;
  id: number;
  name: string;
  type: string;
  sub_type: string | null;
  data: string; // JSON stringified music/item data
  transferable: boolean;
  consumable: boolean;
  print_limit: number;
  total_printed: number;
  image_filename: string;
  rarity: string | null;
  quantity: number;
}

export interface SplSkin {
  player: string;
  card_detail_id: number;
  skin: string;
  qty: number;
  active: boolean;
  skin_detail_id: number;
}
