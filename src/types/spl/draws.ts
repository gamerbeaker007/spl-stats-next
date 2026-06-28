export type SplRankedDrawStatus = {
  current_ranked_draw: {
    id: number;
    end_date: string;
    total_entries: number;
    player_entries: number;
    player_has_pass: boolean;
  };
  first_unclaimed_ranked_draw: null | {
    id: number;
    end_date: string;
    total_entries: number;
    player_entries: number;
    player_has_pass: boolean;
  };
  remaining_pass_details: {
    remaining_draws: number;
    player_pass_count: number;
  };
};

export type SplFrontierDrawStatus = {
  current_frontier_draw: {
    id: number;
    end_date: string;
    total_entries: number;
    player_entries: number;
  };
  first_unclaimed_frontier_draw: null | {
    id: number;
    end_date: string;
    total_entries: number;
    player_entries: number;
  };
};

export interface SplFortuneVerificationData {
  trx_id: string;
  block_id: string;
  block_num: number;
  block_time: Date;
  prev_block_id: string;
}

export interface SplFortuneDraw {
  id: number;
  end_date: Date;
  total_entries: number;
  player_entries: number;
  verification_data: SplFortuneVerificationData;
  draw_number: number;
}

export interface SplCompleteFortuneDraws {
  draws: SplFortuneDraw[];
}

export interface SplFortuneEntry {
  player: string;
  entries: number;
  last_update_date: Date;
}

export interface SplAvailablePrize {
  card_detail_id: number;
  card_edition: number;
  card_foil: number;
  card_mint: string;
  card_tier: number;
  card_uid: string;
  card_xp: number;
}
