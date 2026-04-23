"use server";

import { fetchCardDetails } from "@/lib/backend/api/spl/spl-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getPlayerLeaderboardForSeason } from "@/lib/backend/db/player-leaderboard";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getSeasonById, getLatestSeason } from "@/lib/backend/db/seasons";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";
import { buildMarketData } from "@/lib/backend/services/hive-blog-market";
import { buildDetailedEarnings } from "@/lib/backend/services/hive-blog-earnings";
import { buildRewardSummary } from "@/lib/backend/services/hive-blog-rewards";
import { buildTournaments } from "@/lib/backend/services/hive-blog-tournaments";
import { buildMarkdown } from "@/lib/backend/services/hive-blog-markdown";
import { leagueNames } from "@/lib/utils";
import type { HiveBlogAccountData, HiveBlogPost, HiveBlogResult } from "@/types/hive-blog";

async function getToken(username: string): Promise<string | undefined> {
  const creds = await getSplAccountCredentials(username);
  if (!creds) return undefined;
  return decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
}

export async function getMonitoredAccountsForBlogAction(): Promise<string[]> {
  const accounts = await getMonitoredAccounts();
  return accounts.map((a) => a.username);
}

export async function generateHiveBlogAction(
  selectedAccounts: string[],
  mode: "combined" | "separate" = "combined"
): Promise<HiveBlogResult> {
  if (selectedAccounts.length === 0) throw new Error("No accounts selected");

  // Guard: only allow accounts the caller actually monitors
  const monitored = await getMonitoredAccounts();
  const allowedSet = new Set(monitored.map((a) => a.username));
  const safeAccounts = selectedAccounts.filter((a) => allowedSet.has(a));
  if (safeAccounts.length === 0)
    throw new Error("None of the selected accounts are in your monitored list");

  const latestSeason = await getLatestSeason();
  if (!latestSeason) throw new Error("No season data found in database");

  const previousSeasonId = latestSeason.id - 1;

  const [prevSeason, prevPrevSeason] = await Promise.all([
    getSeasonById(previousSeasonId),
    getSeasonById(previousSeasonId - 1),
  ]);

  const seasonEnd = prevSeason ? new Date(prevSeason.endsAt) : new Date();
  const seasonStart = prevPrevSeason ? new Date(prevPrevSeason.endsAt) : new Date(0);

  let cardDetailsMap: Map<number, string> = new Map();
  try {
    const allCards = await fetchCardDetails();
    cardDetailsMap = new Map(allCards.map((c) => [c.id, c.name]));
  } catch {
    // non-fatal — cards will fall back to "Card #<id>"
  }

  const missingAccounts: string[] = [];
  const unclaimedRewardAccounts: string[] = [];
  const accounts: HiveBlogAccountData[] = [];

  for (const username of safeAccounts) {
    const [leaderboardRows, token, seasonRows] = await Promise.all([
      getPlayerLeaderboardForSeason(username, previousSeasonId),
      getToken(username),
      getSeasonBalances(username, previousSeasonId),
    ]);

    const hasGlintSeasonRewards = seasonRows.some(
      (r) => r.token === "GLINT" && r.type === "season_rewards" && r.earned > 0
    );
    if (!hasGlintSeasonRewards) unclaimedRewardAccounts.push(username);

    const { earned, costs } = buildDetailedEarnings(seasonRows);

    const emptyMarket = { boughtCards: [], soldCards: [], boughtItems: [], soldItems: [] };
    const [rewards, tournaments, marketData] = await Promise.all([
      buildRewardSummary(username, previousSeasonId, seasonStart, seasonEnd, token, cardDetailsMap),
      buildTournaments(username, seasonStart, seasonEnd, token),
      token
        ? buildMarketData(username, seasonStart, seasonEnd, cardDetailsMap, token)
        : Promise.resolve(emptyMarket),
    ]);

    if (
      leaderboardRows.length === 0 &&
      earned.length === 0 &&
      costs.length === 0 &&
      rewards === null &&
      tournaments.length === 0
    ) {
      missingAccounts.push(username);
    }

    const leaderboard = leaderboardRows
      .filter((r) => (r.battles ?? 0) > 0)
      .map((r) => ({
        format: r.format,
        battles: r.battles ?? 0,
        wins: r.wins ?? 0,
        winPct: r.battles && r.battles > 0 ? (((r.wins ?? 0) / r.battles) * 100).toFixed(1) : "0.0",
        league: r.league == null ? "—" : (leagueNames[r.league] ?? `League ${r.league}`),
        leagueNum: r.league ?? null,
        rating: r.rating ?? 0,
        rank: r.rank,
      }));

    accounts.push({
      username,
      leaderboard,
      earned,
      costs,
      rewards,
      tournaments,
      boughtCards: marketData.boughtCards,
      soldCards: marketData.soldCards,
      boughtItems: marketData.boughtItems,
      soldItems: marketData.soldItems,
    });
  }

  const title = `Season ${previousSeasonId} - Splinterlands Season Report`;
  const body = buildMarkdown(previousSeasonId, accounts);

  const posts: HiveBlogPost[] = accounts.map((acc) => ({
    title: `Season ${previousSeasonId} - Splinterlands Season Report @${acc.username}`,
    body: buildMarkdown(previousSeasonId, [acc]),
    username: acc.username,
  }));

  return {
    previousSeasonId,
    accounts,
    missingAccounts,
    unclaimedRewardAccounts,
    title,
    body,
    posts,
    mode,
  };
}
