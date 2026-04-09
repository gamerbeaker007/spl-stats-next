export interface SplCardCollection {
  player: string;
  collection_power: number;
  cards: SplPlayerCard[];
}

export interface SplPlayerCard {
  player: string;
  uid: string;
  card_detail_id: number;
  xp: number;
  gold: boolean;
  edition: number;
  card_set: string;
  collection_power: number;
  display_name: string;
  bcx: number;
  set_id: string;
  bcx_unbound: number;
  foil: number;
  mint: string | null;
  level: number;
}

export interface EnrichedCollectionCard extends SplPlayerCard {
  count: number;
}
