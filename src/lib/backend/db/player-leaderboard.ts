import prisma from "@/lib/prisma";

export interface PlayerLeaderboardEntry {
  username: string;
  seasonId: number;
  format: string;
  rating: number | null;
  rank: number | null;
  battles: number | null;
  wins: number | null;
  longestStreak: number | null;
  maxRating: number | null;
  league: number | null;
  maxLeague: number | null;
  rshares: number | null;
}

export async function upsertPlayerLeaderboard(entry: PlayerLeaderboardEntry) {
  return prisma.playerLeaderboard.upsert({
    where: {
      username_seasonId_format: {
        username: entry.username,
        seasonId: entry.seasonId,
        format: entry.format,
      },
    },
    create: {
      username: entry.username,
      seasonId: entry.seasonId,
      format: entry.format,
      rating: entry.rating,
      rank: entry.rank,
      battles: entry.battles,
      wins: entry.wins,
      longestStreak: entry.longestStreak,
      maxRating: entry.maxRating,
      league: entry.league,
      maxLeague: entry.maxLeague,
      rshares: entry.rshares,
    },
    update: {
      rating: entry.rating,
      // Preserve an existing rank when the API returns null (e.g. mid-season,
      // not yet ranked). The current season is re-synced each worker cycle so
      // the rank will be written as soon as the API provides it.
      rank: entry.rank ?? undefined,
      battles: entry.battles,
      wins: entry.wins,
      longestStreak: entry.longestStreak,
      maxRating: entry.maxRating,
      league: entry.league,
      maxLeague: entry.maxLeague,
      rshares: entry.rshares,
    },
  });
}

export async function deletePlayerLeaderboardByUsername(username: string) {
  return prisma.playerLeaderboard.deleteMany({ where: { username } });
}
