"use server";
import { FortuneWinner } from "@prisma/client";
import { findFortuneWinnersDB } from "../../db/foruneWinner";

export async function findFortuneWinners(users: string[]): Promise<FortuneWinner[]> {
  return await findFortuneWinnersDB(users);
}
