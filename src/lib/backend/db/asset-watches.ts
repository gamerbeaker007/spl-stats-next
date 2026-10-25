import prisma from "@/lib/prisma";

const watchSelect = {
  assetName: true,
  detailId: true,
  priceAtWatch: true,
  watchedAt: true,
} as const;

export async function listAssetWatches(username: string, assetName: string) {
  return prisma.assetWatch.findMany({ where: { username, assetName }, select: watchSelect });
}

/** Watching an already-watched item keeps the original snapshot. */
export async function upsertAssetWatch(
  username: string,
  assetName: string,
  detailId: string,
  priceAtWatch: number
) {
  return prisma.assetWatch.upsert({
    where: { username_assetName_detailId: { username, assetName, detailId } },
    create: { username, assetName, detailId, priceAtWatch },
    update: {},
    select: watchSelect,
  });
}

export async function deleteAssetWatch(username: string, assetName: string, detailId: string) {
  await prisma.assetWatch.deleteMany({ where: { username, assetName, detailId } });
}
