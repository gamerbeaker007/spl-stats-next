import { SplAvailablePrize } from "../spl/draws";

export interface GeneratedFortuneWinner {
  player: string;
  entries: number;
  prize: SplAvailablePrize;
}

/** Aggregated top-winner row (by number of wins) for a fortune draw type. */
export interface TopFortuneWinner {
  player: string;
  count: number;
  entries: number;
}
