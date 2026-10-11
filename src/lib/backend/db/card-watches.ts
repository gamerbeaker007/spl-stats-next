import prisma from "@/lib/prisma";

const watchSelect = {
  cardDetailId: true,
  edition: true,
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
  edition: number,
  foil: number,
  lowPriceBcxAtWatch: number,
  lowPriceAtWatch: number
) {
  return prisma.cardWatch.upsert({
    where: { username_cardDetailId_edition_foil: { username, cardDetailId, edition, foil } },
    create: { username, cardDetailId, edition, foil, lowPriceBcxAtWatch, lowPriceAtWatch },
    update: {},
    select: watchSelect,
  });
}

export async function deleteCardWatch(
  username: string,
  cardDetailId: number,
  edition: number,
  foil: number
) {
  await prisma.cardWatch.deleteMany({ where: { username, cardDetailId, edition, foil } });
}
