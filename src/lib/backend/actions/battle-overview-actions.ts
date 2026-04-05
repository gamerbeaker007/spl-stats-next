"use server";

import {
  getBestCardStats,
  getCardDetailBattles,
  getBattleTeams,
  getLosingCardStats,
  getNemesisCards,
  getPairedCards,
  getDistinctRulesets,
  hasBattleData,
  type BattleQueryFilter,
} from "@/lib/backend/db/battle-cards";
import { getMonitoredAccounts } from "./auth-actions";
import { getCardImg } from "@/lib/collectionUtils";
import type {
  BestCardStat,
  BattleFilter,
  BattleTeamCard,
  DetailedBattleEntry,
  CardDetailResult,
  FormatStat,
  LosingCardStat,
  MatchTypeStat,
  RulesetCount,
} from "@/types/battles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toQueryFilter(filter: BattleFilter): BattleQueryFilter {
  return {
    account: filter.account,
    formats: filter.formats,
    cardTypes: filter.cardTypes,
    matchTypes: filter.matchTypes,
    rarities: filter.rarities,
    colors: filter.colors,
    editions: filter.editions,
    promoTiers: filter.promoTiers,
    rewardTiers: filter.rewardTiers,
    extraTiers: filter.extraTiers,
    minManaCap: filter.minManaCap,
    maxManaCap: filter.maxManaCap,
    rulesets: filter.rulesets,
    groupLevels: filter.groupLevels,
    minBattleCount: filter.minBattleCount,
    sortBy: filter.sortBy,
    since:
      filter.sinceDays > 0
        ? new Date(Date.now() - filter.sinceDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
  };
}

function cardImageUrl(cardName: string, edition: number, gold: boolean, level: number): string {
  return getCardImg(cardName, edition, gold ? "gold" : "regular", level);
}

function sortBestCards(cards: BestCardStat[], sortBy: BattleFilter["sortBy"]): BestCardStat[] {
  switch (sortBy) {
    case "win_percentage":
      return [...cards].sort((a, b) => b.winPercentage - a.winPercentage);
    case "wins":
      return [...cards].sort((a, b) => b.wins - a.wins);
    case "losses":
      return [...cards].sort((a, b) => b.losses - a.losses);
    default:
      return [...cards].sort((a, b) => b.battles - a.battles);
  }
}

// ---------------------------------------------------------------------------
// getMonitoredAccountNamesAction
// ---------------------------------------------------------------------------

export async function getMonitoredAccountNamesAction(): Promise<string[]> {
  const accounts = await getMonitoredAccounts();
  return accounts.map((a) => a.username);
}

// ---------------------------------------------------------------------------
// getBestCardsAction
// ---------------------------------------------------------------------------

export async function getBestCardsAction(filter: BattleFilter): Promise<BestCardStat[]> {
  if (!filter.account) return [];

  const aggs = await getBestCardStats(toQueryFilter(filter));

  const cards: BestCardStat[] = aggs.map((a) => ({
    cardDetailId: a.cardDetailId,
    cardName: a.cardName,
    cardType: a.cardType,
    rarity: a.rarity,
    color: a.color,
    edition: a.edition,
    level: a.level,
    gold: a.gold,
    battles: a.battles,
    wins: a.wins,
    losses: a.losses,
    winPercentage: a.battles > 0 ? Math.round((a.wins / a.battles) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(a.cardName, a.edition, a.gold, a.level),
  }));

  return sortBestCards(cards, filter.sortBy);
}

// ---------------------------------------------------------------------------
// getLosingCardsAction
// ---------------------------------------------------------------------------

export async function getLosingCardsAction(filter: BattleFilter): Promise<LosingCardStat[]> {
  if (!filter.account) return [];

  // For losing page, strip player-only filters (they apply to opponent cards)
  const aggs = await getLosingCardStats(toQueryFilter(filter));

  return aggs
    .sort((a, b) => b.battles - a.battles)
    .map((a) => ({
      cardDetailId: a.cardDetailId,
      cardName: a.cardName,
      cardType: a.cardType,
      rarity: a.rarity,
      color: a.color,
      edition: a.edition,
      level: a.level,
      gold: a.gold,
      battles: a.battles,
      imageUrl: cardImageUrl(a.cardName, a.edition, a.gold, a.level),
    }));
}

// ---------------------------------------------------------------------------
// getCardDetailAction
// ---------------------------------------------------------------------------

export async function getCardDetailAction(
  cardDetailId: number,
  filter: BattleFilter
): Promise<CardDetailResult | null> {
  if (!filter.account) return null;

  // Fetch all battles for this specific card (ignore cardType/rarity/color/edition filters
  // since we're looking at one specific card — apply only battle-context filters)
  const cardFilter: BattleQueryFilter = {
    ...toQueryFilter(filter),
    // Remove card-specific filters since we're viewing a fixed card
    cardTypes: [],
    rarities: [],
    colors: [],
    editions: [],
  };

  const battles = await getCardDetailBattles(cardDetailId, cardFilter);

  if (battles.length === 0) return null;

  // Derive stat for this card
  const first = battles[0];
  let wins = 0;
  let losses = 0;
  let maxLevel = 0;
  let hasGold = false;
  for (const b of battles) {
    if (b.result === "win") wins++;
    else losses++;
    if (b.level > maxLevel) {
      maxLevel = b.level;
      hasGold = b.gold;
    }
  }

  const stat: BestCardStat = {
    cardDetailId: first.cardDetailId,
    cardName: first.cardName,
    cardType: first.cardType,
    rarity: first.rarity,
    color: first.color,
    edition: first.edition,
    level: maxLevel,
    gold: hasGold,
    battles: battles.length,
    wins,
    losses,
    winPercentage: battles.length > 0 ? Math.round((wins / battles.length) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(first.cardName, first.edition, hasGold, maxLevel),
  };

  // Ruleset breakdown (all rulesets across all battles)
  const rulesetCounts = new Map<string, number>();
  for (const b of battles) {
    for (const rs of [b.ruleset1, b.ruleset2, b.ruleset3]) {
      if (rs && rs !== "None" && rs !== "") {
        rulesetCounts.set(rs, (rulesetCounts.get(rs) ?? 0) + 1);
      }
    }
  }
  const rulesets: RulesetCount[] = Array.from(rulesetCounts.entries())
    .map(([ruleset, count]) => ({ ruleset, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Match type breakdown
  const matchTypeMap = new Map<string, { wins: number; losses: number }>();
  for (const b of battles) {
    if (!matchTypeMap.has(b.matchType)) matchTypeMap.set(b.matchType, { wins: 0, losses: 0 });
    const e = matchTypeMap.get(b.matchType)!;
    if (b.result === "win") e.wins++;
    else e.losses++;
  }
  const matchTypeStats: MatchTypeStat[] = Array.from(matchTypeMap.entries())
    .map(([matchType, { wins: w, losses: l }]) => ({
      matchType,
      wins: w,
      losses: l,
      total: w + l,
      winPct: w + l > 0 ? Math.round((w / (w + l)) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Format (match mode) breakdown
  const formatMap = new Map<string, { wins: number; losses: number }>();
  for (const b of battles) {
    if (!formatMap.has(b.format)) formatMap.set(b.format, { wins: 0, losses: 0 });
    const e = formatMap.get(b.format)!;
    if (b.result === "win") e.wins++;
    else e.losses++;
  }
  const formatStats: FormatStat[] = Array.from(formatMap.entries())
    .map(([format, { wins: w, losses: l }]) => ({
      format,
      wins: w,
      losses: l,
      total: w + l,
      winPct: w + l > 0 ? Math.round((w / (w + l)) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Battle IDs for paired + nemesis queries
  const allBattleIds = battles.map((b) => b.battleId);
  const losingBattleIds = battles.filter((b) => b.result === "loss").map((b) => b.battleId);

  // Paired cards
  const paired = await getPairedCards(filter.account, allBattleIds, cardDetailId);
  const pairedWithImage = paired.map((p) => ({
    cardDetailId: p.cardDetailId,
    cardName: p.cardName,
    cardType: p.cardType,
    rarity: p.rarity,
    color: p.color,
    edition: p.edition,
    level: p.level,
    gold: p.gold,
    battles: p.battles,
    wins: p.wins,
    losses: p.losses,
    winPercentage: p.battles > 0 ? Math.round((p.wins / p.battles) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(p.cardName, p.edition, p.gold, p.level),
  }));
  const pairedSummoners = pairedWithImage.filter((p) => p.cardType === "Summoner").slice(0, 2);
  const pairedMonsters = pairedWithImage.filter((p) => p.cardType === "Monster").slice(0, 5);

  // Nemesis cards (what beats you when you play this card)
  const nemesis = await getNemesisCards(filter.account, losingBattleIds);
  const nemesisWithImage = nemesis.map((n) => ({
    cardDetailId: n.cardDetailId,
    cardName: n.cardName,
    cardType: n.cardType,
    rarity: n.rarity,
    color: n.color,
    edition: n.edition,
    level: n.level,
    gold: n.gold,
    battles: n.battles,
    imageUrl: cardImageUrl(n.cardName, n.edition, n.gold, n.level),
  }));
  const nemesisSummoners = nemesisWithImage.filter((n) => n.cardType === "Summoner").slice(0, 2);
  const nemesisMonsters = nemesisWithImage.filter((n) => n.cardType === "Monster").slice(0, 5);

  // Last 5 won + lost battles
  const winBattles = battles.filter((b) => b.result === "win").slice(0, 5);
  const lossBattles = battles.filter((b) => b.result === "loss").slice(0, 5);

  // Fetch full team card images for last won/lost battles
  const lastBattleIds = [...winBattles, ...lossBattles].map((b) => b.battleId);
  const teamRows = await getBattleTeams(filter.account, lastBattleIds);

  const playerTeamsByBattle = new Map<string, typeof teamRows>();
  const opponentTeamsByBattle = new Map<string, typeof teamRows>();
  for (const row of teamRows) {
    const map = row.owner === "player" ? playerTeamsByBattle : opponentTeamsByBattle;
    if (!map.has(row.battleId)) map.set(row.battleId, []);
    map.get(row.battleId)!.push(row);
  }

  const toTeamCard = (r: (typeof teamRows)[0]): BattleTeamCard => ({
    position: r.position,
    cardDetailId: r.cardDetailId,
    cardName: r.cardName,
    cardType: r.cardType,
    level: r.level,
    edition: r.edition,
    gold: r.gold,
    imageUrl: cardImageUrl(r.cardName, r.edition, r.gold, r.level),
  });

  const toEntry = (b: (typeof battles)[0]): DetailedBattleEntry => ({
    battleId: b.battleId,
    opponent: b.opponent,
    createdDate: b.createdDate.toISOString(),
    format: b.format,
    matchType: b.matchType,
    manaCap: b.manaCap,
    ruleset1: b.ruleset1,
    ruleset2: b.ruleset2,
    ruleset3: b.ruleset3,
    result: b.result,
    playerTeam: (playerTeamsByBattle.get(b.battleId) ?? [])
      .sort((a, c) => a.position - c.position)
      .map(toTeamCard),
    opponentTeam: (opponentTeamsByBattle.get(b.battleId) ?? [])
      .sort((a, c) => a.position - c.position)
      .map(toTeamCard),
  });

  // Mana cap distribution (10-unit buckets)
  const buckets = [
    "0-10",
    "10-20",
    "20-30",
    "30-40",
    "40-50",
    "50-60",
    "60-70",
    "70-80",
    "80-90",
    "90-100",
  ];
  const bucketCounts = new Map<string, number>(buckets.map((b) => [b, 0]));
  for (const b of battles) {
    const start = Math.floor(b.manaCap / 10) * 10;
    const label = `${start}-${Math.min(start + 10, 100)}`;
    if (bucketCounts.has(label)) bucketCounts.set(label, (bucketCounts.get(label) ?? 0) + 1);
  }
  const manaCapData = buckets.map((b) => ({ bucket: b, count: bucketCounts.get(b) ?? 0 }));

  return {
    stat,
    rulesets,
    matchTypeStats,
    formatStats,
    pairedSummoners,
    pairedMonsters,
    nemesisSummoners,
    nemesisMonsters,
    lastWins: winBattles.map(toEntry),
    lastLosses: lossBattles.map(toEntry),
    manaCapData,
  };
}

// ---------------------------------------------------------------------------
// getDistinctRulesetsAction
// ---------------------------------------------------------------------------

export async function getDistinctRulesetsAction(account: string): Promise<string[]> {
  if (!account) return [];
  return getDistinctRulesets(account);
}

// ---------------------------------------------------------------------------
// hasBattleDataAction
// ---------------------------------------------------------------------------

export async function hasBattleDataAction(account: string): Promise<boolean> {
  if (!account) return false;
  return hasBattleData(account);
}
