import { prisma } from "@/lib/prisma";
import { GeneratedFortuneWinner } from "@/types/fortune/fortune";
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
    type: type,

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

export const createFortuneWinners = async (
  type: FortuneType,
  draw: SplFortuneDraw,
  winners: GeneratedFortuneWinner[]
) => {
  await prisma.$transaction(async (tx) => {
    await tx.fortuneWinner.createMany({
      data: winners.map((winner) => mapWinnerToPrisma(type, draw, winner)),
      skipDuplicates: true,
    });
  });
};

export const findFortuneWinners = async (players: string[]) => {
  return await prisma.fortuneWinner.findMany({
    where: { player: { in: players } },
    orderBy: { drawId: "desc" },
  });
};

export const getTopTenFortuneWinners = async (type: FortuneType) => {
  const winners = await prisma.fortuneWinner.groupBy({
    by: ["player"],
    where: { type },
    _count: {
      player: true,
    },
    orderBy: {
      _count: {
        player: "desc",
      },
    },
    take: 10,
  });

  return winners.map(({ player, _count }) => ({
    player,
    count: _count.player,
  }));
};
