import prisma from "@/lib/prisma";

export async function upsertSeason(id: number, endsAt: Date) {
  return prisma.season.upsert({
    where: { id },
    create: { id, endsAt },
    update: { endsAt },
  });
}

export async function getLatestSeason() {
  return prisma.season.findFirst({ orderBy: { id: "desc" } });
}

export async function getAllSeasons() {
  return prisma.season.findMany({ orderBy: { id: "asc" } });
}

export async function getSeasonById(id: number) {
  return prisma.season.findUnique({ where: { id } });
}
