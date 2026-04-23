import { fetchPlayerTournamentIds, fetchTournament } from "@/lib/backend/api/spl/spl-api";
import type { HiveBlogTournamentRow } from "@/types/hive-blog";

const LEAGUE_NAMES_BY_RATING: Record<number, string> = {
  0: "Novice",
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Diamond",
  5: "Champion",
};

export async function buildTournaments(
  username: string,
  startDate: Date,
  endDate: Date,
  token: string | undefined
): Promise<HiveBlogTournamentRow[]> {
  if (!token) return [];
  try {
    const ids = await fetchPlayerTournamentIds(username, token);
    if (ids.length === 0) return [];

    const results: HiveBlogTournamentRow[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const t = await fetchTournament(id);
        if (!t) return;
        if (t.status !== 2) return;
        if (!t.rounds?.length) return;

        const lastRound = t.rounds.at(-1)!;
        if (lastRound.status !== 2) return;

        const roundDate = new Date(lastRound.start_date);
        if (roundDate < startDate || roundDate > endDate) return;

        const playerData = t.players.find((p) => p.player === username);
        if (!playerData) return;

        let prizeQty = "0";
        let prizeType = "";
        if (playerData.prize) {
          prizeQty = playerData.prize;
        } else if (playerData.ext_prize_info) {
          try {
            const info = JSON.parse(playerData.ext_prize_info);
            if (Array.isArray(info) && info[0]) {
              prizeQty = String(info[0].qty ?? "0");
              prizeType = String(info[0].type ?? "");
            }
          } catch {
            // ignore malformed ext_prize_info
          }
        }

        results.push({
          name: t.name,
          league: LEAGUE_NAMES_BY_RATING[t.data?.rating_level ?? 0] ?? "Unknown",
          numPlayers: t.num_players,
          finish: playerData.finish,
          wins: playerData.wins,
          losses: playerData.losses,
          draws: playerData.draws,
          entryFee: playerData.fee_amount ?? "0",
          prizeQty,
          prizeType,
        });
      })
    );

    return results.sort((a, b) => (a.finish ?? 999) - (b.finish ?? 999));
  } catch {
    return [];
  }
}
