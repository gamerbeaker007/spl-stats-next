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

/**
 * All leaderboard rows for an account, ordered by season ascending.
 * Optionally filtered to a single format.
 */
export async function getPlayerLeaderboardHistory(
  username: string,
  format?: string
): Promise<PlayerLeaderboardEntry[]> {
  const rows = await prisma.playerLeaderboard.findMany({
    where: { username, ...(format ? { format } : {}) },
    orderBy: { seasonId: "asc" },
  });
  return rows.map((r) => ({
    username: r.username,
    seasonId: r.seasonId,
    format: r.format,
    rating: r.rating,
    rank: r.rank,
    battles: r.battles,
    wins: r.wins,
    longestStreak: r.longestStreak,
    maxRating: r.maxRating,
    league: r.league,
    maxLeague: r.maxLeague,
    rshares: r.rshares,
  }));
}
