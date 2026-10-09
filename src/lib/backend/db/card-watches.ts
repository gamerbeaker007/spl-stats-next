import prisma from "@/lib/prisma";

const watchSelect = {
  cardDetailId: true,
  foil: true,
  lowPriceBcxAtWatch: true,
  lowPriceAtWatch: true,
  watchedAt: true,
} as const;

export async function listCardWatches(username: string) {
  return prisma.cardWatch.findMany({ where: { username }, select: watchSelect });
}

/** Watching an already-watched card keeps the original snapshot. */
export async function upsertCardWatch(
  username: string,
  cardDetailId: number,
  foil: number,
  lowPriceBcxAtWatch: number,
  lowPriceAtWatch: number
) {
  return prisma.cardWatch.upsert({
    where: { username_cardDetailId_foil: { username, cardDetailId, foil } },
    create: { username, cardDetailId, foil, lowPriceBcxAtWatch, lowPriceAtWatch },
    update: {},
    select: watchSelect,
  });
}

export async function deleteCardWatch(username: string, cardDetailId: number, foil: number) {
  await prisma.cardWatch.deleteMany({ where: { username, cardDetailId, foil } });
}
