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
  bcx: number;
  bcx_unbound: number;
  foil: number;
  mint: string | null;
  level: number;
  delegated_to?: string | null;
  wagon_uid: string | null; // is card on wagon? if so, this is the wagon's uid
  set_id: string | null; // is card in a set? if so, this is the set's id
}

export interface EnrichedCollectionCard extends SplPlayerCard {
  count: number;
}
