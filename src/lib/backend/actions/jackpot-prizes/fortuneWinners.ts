"use server";

import { findFortuneWinners, getTopFortuneWinners } from "@/lib/backend/db/fortune-winners";
import { TopFortuneWinner } from "@/types/fortune/fortune";
import { FortuneType, FortuneWinner } from "@prisma/client";

/** Fortune winners for the given players (used by the account search list). */
export async function getFortuneWinnersAction(players: string[]): Promise<FortuneWinner[]> {
  return findFortuneWinners(players);
}

/** Top winners (by number of wins) for a given fortune draw type. */
export async function getTopFortuneWinnersAction(type: FortuneType): Promise<TopFortuneWinner[]> {
  return getTopFortuneWinners(type);
}
