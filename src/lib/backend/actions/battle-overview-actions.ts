"use server";

import {
  getBestCardStats,
  getCardDetailBattles,
  getBattleTeams,
  getDistinctCardsByAccount,
  getLosingCardStats,
  getNemesisCards,
  getPairedCards,
  getDistinctRulesets,
  hasBattleData,
  type BattleQueryFilter,
} from "@/lib/backend/db/battle-cards";
import { getMonitoredAccounts } from "./auth-actions";
import { fetchBattleResult, fetchCardDetails } from "@/lib/backend/api/spl/spl-api";
import { getCardImg } from "@/lib/collectionUtils";
import type {
  BestCardStat,
  BattleTeamCard,
  DetailedBattleEntry,
  CardDetailResult,
  FormatStat,
  LosingCardStat,
  MatchTypeStat,
  RulesetCount,
} from "@/types/battles";
import { cardFoilOptions } from "@/types/card";
import { UnifiedCardFilter } from "@/types/card-filter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toQueryFilter(filter: UnifiedCardFilter): BattleQueryFilter {
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
    groupFoils: filter.groupFoils,
    cardName: filter.cardName || undefined,
    minBattleCount: filter.minBattleCount,
    sortBy: filter.sortBy,
    foilCategories: filter.foilCategories
      .map((f) => cardFoilOptions.indexOf(f as (typeof cardFoilOptions)[number]))
      .filter((v) => v >= 0),
    since:
      filter.sinceDays > 0
        ? new Date(Date.now() - filter.sinceDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
  };
}

function cardImageUrl(cardName: string, edition: number, foil: number, level: number): string {
  const cardFoil = cardFoilOptions[foil];
  // getCardImg only has regular/gold image variants; map all non-regular foils to "gold".
  return getCardImg(cardName, edition, cardFoil, level);
}

function sortBestCards(cards: BestCardStat[], sortBy: UnifiedCardFilter["sortBy"]): BestCardStat[] {
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

function parseBattleSyncAccounts(): string[] | null {
  const raw = (process.env.BATTLE_SYNC_ACCOUNTS ?? "").trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function getMonitoredAccountNamesAction(): Promise<string[]> {
  const accounts = await getMonitoredAccounts();
  const all = accounts.map((a) => a.username);
  const allowed = parseBattleSyncAccounts();
  if (!allowed) return all;
  return all.filter((u) => allowed.includes(u.toLowerCase()));
}

// ---------------------------------------------------------------------------
// getBattleAccessStatusAction
// ---------------------------------------------------------------------------

export async function getBattleAccessStatusAction(): Promise<{
  isRestricted: boolean;
  isPartial: boolean;
}> {
  const accounts = await getMonitoredAccounts();
  const all = accounts.map((a) => a.username);
  const allowed = parseBattleSyncAccounts();
  if (!allowed) return { isRestricted: false, isPartial: false };
  const available = all.filter((u) => allowed.includes(u.toLowerCase()));
  return {
    isRestricted: available.length === 0,
    isPartial: available.length > 0 && available.length < all.length,
  };
}

// ---------------------------------------------------------------------------
// getCardOptionsAction — distinct cards played by an account (for card select)
// ---------------------------------------------------------------------------

export async function getCardOptionsAction(
  account: string
): Promise<{ cardDetailId: number; cardName: string }[]> {
  if (!account) return [];
  return getDistinctCardsByAccount(account);
}

// ---------------------------------------------------------------------------
// getBestCardsAction
// ---------------------------------------------------------------------------

export async function getBestCardsAction(filter: UnifiedCardFilter): Promise<BestCardStat[]> {
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
    foil: a.foil,
    battles: a.battles,
    wins: a.wins,
    losses: a.losses,
    winPercentage: a.battles > 0 ? Math.round((a.wins / a.battles) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(a.cardName, a.edition, a.foil, a.level),
  }));

  return sortBestCards(cards, filter.sortBy);
}

// ---------------------------------------------------------------------------
// getLosingCardsAction
// ---------------------------------------------------------------------------

export async function getLosingCardsAction(filter: UnifiedCardFilter): Promise<LosingCardStat[]> {
  if (!filter.account) return [];

  let aggs;
  try {
    // For losing page, strip player-only filters (they apply to opponent cards)
    aggs = await getLosingCardStats(toQueryFilter(filter));
  } catch (e) {
    console.error("getLosingCardsAction: DB query failed", e);
    return [];
  }

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
      foil: a.foil,
      battles: a.battles,
      imageUrl: cardImageUrl(a.cardName, a.edition, a.foil, a.level),
    }));
}

// ---------------------------------------------------------------------------
// getCardDetailAction
// ---------------------------------------------------------------------------

export async function getCardDetailAction(
  cardDetailId: number,
  filter: UnifiedCardFilter
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
    foilCategories: [],
  };

  const battles = await getCardDetailBattles(cardDetailId, cardFilter);

  if (battles.length === 0) return null;

  // Derive stat for this card
  const first = battles[0];
  let wins = 0;
  let losses = 0;
  let maxLevel = 0;
  let highestFoilFound = 0;
  for (const b of battles) {
    if (b.result === "win") wins++;
    else losses++;
    if (b.level > maxLevel) {
      maxLevel = b.level;
      highestFoilFound = b.foil;
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
    foil: highestFoilFound,
    battles: battles.length,
    wins,
    losses,
    winPercentage: battles.length > 0 ? Math.round((wins / battles.length) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(first.cardName, first.edition, highestFoilFound, maxLevel),
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
    foil: p.foil,
    battles: p.battles,
    wins: p.wins,
    losses: p.losses,
    winPercentage: p.battles > 0 ? Math.round((p.wins / p.battles) * 1000) / 10 : 0,
    imageUrl: cardImageUrl(p.cardName, p.edition, p.foil, p.level),
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
    foil: n.foil,
    battles: n.battles,
    imageUrl: cardImageUrl(n.cardName, n.edition, n.foil, n.level),
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
    foil: r.foil,
    imageUrl: cardImageUrl(r.cardName, r.edition, r.foil, r.level),
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

// ---------------------------------------------------------------------------
// getBattleEntriesAction — fetch full battle details from SPL API for given
// battle IDs and build DetailedBattleEntry objects with both teams.
// Used by the card detail page to show last 5 won/lost battles with live data.
// ---------------------------------------------------------------------------

export async function getBattleEntriesAction(
  account: string,
  battleIds: string[]
): Promise<DetailedBattleEntry[]> {
  if (!account || battleIds.length === 0) return [];

  const [results, cardDetailList] = await Promise.all([
    Promise.allSettled(battleIds.map((id) => fetchBattleResult(id))),
    fetchCardDetails(),
  ]);
  const cardMap = new Map(cardDetailList.map((c) => [c.id, c]));

  const entries: DetailedBattleEntry[] = [];

  for (const outcome of results) {
    if (outcome.status === "rejected") continue;
    const battle = outcome.value;

    // /battle/result returns details as a raw JSON string
    if (!battle.details || battle.details === "undefined") continue;
    let details: import("@/types/spl/battle").SplBattleDetails;
    try {
      details = JSON.parse(battle.details);
    } catch {
      continue;
    }

    if (!details?.team1 || !details?.team2) continue;

    const myTeam =
      details.team1.player.toLowerCase() === account.toLowerCase() ? details.team1 : details.team2;
    const oppTeam =
      details.team1.player.toLowerCase() === account.toLowerCase() ? details.team2 : details.team1;

    const winner = details.winner ?? battle.winner;
    const result = winner?.toLowerCase() === account.toLowerCase() ? "win" : "loss";

    const [ruleset1, ruleset2, ruleset3] = (battle.ruleset ?? "").split("|");

    const toTeamCard = (
      card: {
        card_detail_id: number;
        gold: boolean;
        foil?: number;
        level: number;
        edition: number;
      },
      position: number,
      name: string,
      type: string
    ): BattleTeamCard => {
      const foil = card.foil ?? (card.gold ? 1 : 0);
      return {
        position,
        cardDetailId: card.card_detail_id,
        cardName: name,
        cardType: type,
        level: card.level,
        edition: card.edition,
        foil,
        imageUrl: cardImageUrl(name, card.edition, foil, card.level),
      };
    };

    // SPL API cards don't include card name/type — look up from card details catalogue
    const splCard = (
      c: import("@/types/spl/battle").SplBattleCard,
      position: number
    ): BattleTeamCard => {
      const detail = cardMap.get(c.card_detail_id);
      const name = detail?.name ?? `Card #${c.card_detail_id}`;
      const cardType = detail?.type ?? "Monster";
      return toTeamCard(c, position, name, cardType);
    };

    const playerTeam = [
      splCard(myTeam.summoner, 0),
      ...myTeam.monsters.map((m: import("@/types/spl/battle").SplBattleCard, i: number) =>
        splCard(m, i + 1)
      ),
    ];
    const opponentTeam = [
      splCard(oppTeam.summoner, 0),
      ...oppTeam.monsters.map((m: import("@/types/spl/battle").SplBattleCard, i: number) =>
        splCard(m, i + 1)
      ),
    ];

    entries.push({
      battleId: battle.battle_queue_id_1,
      opponent:
        battle.player_1.toLowerCase() === account.toLowerCase() ? battle.player_2 : battle.player_1,
      createdDate: battle.created_date,
      format: battle.format ?? "wild",
      matchType: battle.match_type,
      manaCap: battle.mana_cap,
      ruleset1: ruleset1 ?? "None",
      ruleset2: ruleset2 ?? "None",
      ruleset3: ruleset3 ?? "None",
      result,
      playerTeam,
      opponentTeam,
    });
  }

  return entries;
}
