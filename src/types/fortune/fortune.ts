import { SplAvailablePrize } from "../spl/draws";

export interface GeneratedFortuneWinner {
  player: string;
  entries: number;
  prize: SplAvailablePrize;
}
