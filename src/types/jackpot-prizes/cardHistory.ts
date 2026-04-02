export interface CardHistoryItem {
  card_id: string;
  transfer_date: string;
  transfer_type: string;
  transfer_tx: string;
  from_player: string;
  to_player: string;
  card_detail_id: number;
  xp: string;
  gold: boolean;
  edition: number;
  payment_amount: string;
  payment_currency: string;
  combined_cards: string;
}

export type CardHistoryResponse = CardHistoryItem[];
