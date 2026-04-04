import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared card fields (no team discriminator needed — separate tables)
// ---------------------------------------------------------------------------

interface BattleCardBase {
  battleId: string;
  account: string;
  position: number;
  opponent: string;
  createdDate: Date;
  matchType: string;
  format: string;
  manaCap: number;
  ruleset1: string;
  ruleset2: string;
  ruleset3: string;
  inactive: string;
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  secondaryColor: string | null;
  xp: number | null;
  gold: boolean;
  level: number;
  edition: number;
}

export interface PlayerBattleCardInput extends BattleCardBase {
  winner: string;
  result: string; // "win" | "loss"
}

// No winner/result — opponent rows only stored on losses
export type OpponentBattleCardInput = BattleCardBase;

// ---------------------------------------------------------------------------
// Upserts
// ---------------------------------------------------------------------------

export async function upsertPlayerBattleCard(card: PlayerBattleCardInput): Promise<void> {
  const { battleId, account, position, ...rest } = card;
  await prisma.playerBattleCard.upsert({
    where: { battleId_account_position: { battleId, account, position } },
    create: { battleId, account, position, ...rest },
    update: rest,
  });
}

export async function upsertPlayerBattleCards(cards: PlayerBattleCardInput[]): Promise<void> {
  for (const card of cards) {
    await upsertPlayerBattleCard(card);
  }
}

export async function upsertOpponentBattleCard(card: OpponentBattleCardInput): Promise<void> {
  const { battleId, account, position, ...rest } = card;
  await prisma.opponentBattleCard.upsert({
    where: { battleId_account_position: { battleId, account, position } },
    create: { battleId, account, position, ...rest },
    update: rest,
  });
}

export async function upsertOpponentBattleCards(cards: OpponentBattleCardInput[]): Promise<void> {
  for (const card of cards) {
    await upsertOpponentBattleCard(card);
  }
}

// ---------------------------------------------------------------------------
// Cursors & utilities
// ---------------------------------------------------------------------------

/**
 * Returns the most recent createdDate stored in the player battles table for an account.
 * Used as a sync cursor so we only fetch battles newer than this.
 */
export async function getLatestPlayerBattleDate(account: string): Promise<Date | null> {
  const row = await prisma.playerBattleCard.findFirst({
    where: { account },
    orderBy: { createdDate: "desc" },
    select: { createdDate: true },
  });
  return row?.createdDate ?? null;
}

export async function deletePlayerBattleCardsByAccount(account: string): Promise<number> {
  const { count } = await prisma.playerBattleCard.deleteMany({ where: { account } });
  return count;
}

export async function deleteOpponentBattleCardsByAccount(account: string): Promise<number> {
  const { count } = await prisma.opponentBattleCard.deleteMany({ where: { account } });
  return count;
}
