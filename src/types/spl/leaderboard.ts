/** Player entry returned in GET /players/leaderboard_with_player — player field only.
 * Fields other than `player` are absent when the account did not participate. */
export interface SplLeaderboardPlayer {
  rank: number | null;
  season?: number;
  player: string;
  rating?: number;
  battles?: number;
  wins?: number;
  longest_streak?: number;
  max_rating?: number;
  league?: number;
  max_league?: number;
  rshares?: number;
}

/** Response shape — only the player field is used */
export interface SplLeaderboardResponse {
  player: SplLeaderboardPlayer | null;
}

export type SplFormats = "foundation" | "wild" | "modern" | "survival";
export const LEADERBOARD_FORMATS: SplFormats[] = ["foundation", "wild", "modern"];
