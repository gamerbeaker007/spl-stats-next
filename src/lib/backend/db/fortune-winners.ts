import { prisma } from "@/lib/prisma";
import { GeneratedFortuneWinner, TopFortuneWinner } from "@/types/fortune/fortune";
import { SplFortuneDraw } from "@/types/spl/draws";
import { FortuneType } from "@prisma/client";

export async function getLatestProcessedDrawId(type: FortuneType): Promise<number> {
  const latest = await prisma.fortuneWinner.findFirst({
    where: { type },
    select: { drawId: true },
    orderBy: { drawId: "desc" },
  });

  return latest?.drawId ?? 0;
}

function mapWinnerToPrisma(
  type: FortuneType,
  draw: SplFortuneDraw,
  winner: GeneratedFortuneWinner
) {
  return {
    type,

    drawId: draw.id,
    drawNumber: draw.draw_number,
    endDate: draw.end_date,
    totalEntries: draw.total_entries,

    trxId: draw.verification_data.trx_id,
    blockId: draw.verification_data.block_id,
    blockNum: draw.verification_data.block_num,
    blockTime: draw.verification_data.block_time,
    prevBlockId: draw.verification_data.prev_block_id,

    player: winner.player,
    entries: winner.entries,

    cardDetailId: winner.prize.card_detail_id,
    cardEdition: winner.prize.card_edition,
    cardFoil: winner.prize.card_foil,
    cardTier: winner.prize.card_tier,
    cardUid: winner.prize.card_uid,
    cardMint: winner.prize.card_mint,
    cardXp: winner.prize.card_xp,
  };
}

export async function createFortuneWinners(
  type: FortuneType,
  draw: SplFortuneDraw,
  winners: GeneratedFortuneWinner[]
) {
  await prisma.fortuneWinner.createMany({
    data: winners.map((winner) => mapWinnerToPrisma(type, draw, winner)),
    skipDuplicates: true,
  });
}

export async function findFortuneWinners(players: string[]) {
  if (players.length === 0) return [];

  return prisma.fortuneWinner.findMany({
    where: { player: { in: players } },
    orderBy: { drawId: "desc" },
  });
}

export async function getTopFortuneWinners(
  type: FortuneType,
  take = 10
): Promise<TopFortuneWinner[]> {
  const winners = await prisma.fortuneWinner.groupBy({
    by: ["player"],
    where: { type },
    _sum: { entries: true },
    _count: { player: true },
    orderBy: { _count: { player: "desc" } },
    take,
  });

  return winners.map(({ player, _count, _sum }) => ({
    player,
    count: _count.player,
    entries: _sum.entries ?? 0,
  }));
}
