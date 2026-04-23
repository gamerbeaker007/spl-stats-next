"use server";

import { getPlayerLeaderboardHistory } from "@/lib/backend/db/player-leaderboard";
import {
  getDistinctTokensForUser,
  getSeasonBalancesByToken,
  getSeasonEarningsSummary,
} from "@/lib/backend/db/season-balances";
import { EARNINGS_TOKENS, TOKEN_TYPE_FILTERS } from "@/lib/shared/season-constants";
import { getCurrentUser } from "./auth-actions";

// ---------------------------------------------------------------------------
// Leaderboard history
// ---------------------------------------------------------------------------

export interface LeaderboardSeasonPoint {
  seasonId: number;
  format: string;
  rating: number | null;
  maxRating: number | null;
  battles: number | null;
  wins: number | null;
  league: number | null;
  rank: number | null;
}

export async function getLeaderboardHistoryAction(
  username?: string
): Promise<LeaderboardSeasonPoint[]> {
  const user = await getCurrentUser();
  const target = username ?? user?.username;
  if (!target) return [];

  const rows = await getPlayerLeaderboardHistory(target);
  return rows.map((r) => ({
    seasonId: r.seasonId,
    format: r.format,
    rating: r.rating,
    maxRating: r.maxRating,
    battles: r.battles,
    wins: r.wins,
    league: r.league,
    rank: r.rank,
  }));
}

// ---------------------------------------------------------------------------
// Earnings summary (DEC / MERITS / GLINT / SPS + unclaimed)
// ---------------------------------------------------------------------------

export interface EarningsSummaryPoint {
  seasonId: number;
  token: string;
  earned: number;
  cost: number;
}

export async function getSeasonEarningsSummaryAction(
  username?: string
): Promise<EarningsSummaryPoint[]> {
  const user = await getCurrentUser();
  const target = username ?? user?.username;
  if (!target) return [];

  return getSeasonEarningsSummary(target, [...EARNINGS_TOKENS], TOKEN_TYPE_FILTERS);
}

// ---------------------------------------------------------------------------
// Per-token detail (all transaction types per season)
// ---------------------------------------------------------------------------

export interface TokenBalanceRow {
  seasonId: number;
  type: string;
  earned: number;
  cost: number;
}

export async function getSeasonTokenDetailAction(
  token: string,
  username?: string
): Promise<TokenBalanceRow[]> {
  const user = await getCurrentUser();
  const target = username ?? user?.username;
  if (!target) return [];

  return getSeasonBalancesByToken(target, token.toUpperCase());
}

export async function getDistinctTokensAction(username?: string): Promise<string[]> {
  const user = await getCurrentUser();
  const target = username ?? user?.username;
  if (!target) return [];

  return getDistinctTokensForUser(target);
}
