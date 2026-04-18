// Types for the SPL battle/history2 API response

export interface SplBattleCard {
  card_detail_id: number;
  gold: boolean;
  foil: number;
  level: number;
  edition: number;
  xp?: number;
}

export interface SplBattleTeam {
  player: string;
  summoner: SplBattleCard;
  monsters: SplBattleCard[];
}

export interface SplBattleDetails {
  winner: string;
  team1: SplBattleTeam;
  team2: SplBattleTeam;
  /** Present when the battle ended by surrender */
  type?: string;
  is_brawl?: boolean;
}

export interface SplBattle {
  battle_queue_id_1: string;
  player_1: string;
  player_2: string;
  created_date: string;
  match_type: string;
  /** null or absent = wild */
  format: string | null;
  mana_cap: number;
  /** "|"-separated ruleset names */
  ruleset: string;
  /** Inactive splinter colours */
  inactive: string;
  winner: string;
  player_1_rating_final?: number;
  player_2_rating_final?: number;
  /** JSON string – parse to check is_training */
  settings: string;
  details: SplBattleDetails;
}

/**
 * Response from GET /battle/result — same shape as SplBattle but details
 * is returned as a raw JSON string instead of a parsed object.
 */
export interface SplBattleResult extends Omit<SplBattle, "details"> {
  details: string;
}

export interface SplBattleHistoryResponse {
  battles: SplBattle[];
}

export const BATTLE_FORMATS = ["wild", "modern", "foundation", "survival"] as const;
export type BattleFormat = (typeof BATTLE_FORMATS)[number];
