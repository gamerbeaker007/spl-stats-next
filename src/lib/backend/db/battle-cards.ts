import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared card fields (no team discriminator needed — separate tables)
// ---------------------------------------------------------------------------

interface BattleCardBase {
  battleId: string;
  account: string;
  position: number;
  opponent: string;
  createdDate: Date;
  matchType: string;
  format: string;
  manaCap: number;
  ruleset1: string;
  ruleset2: string;
  ruleset3: string;
  inactive: string;
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  secondaryColor: string | null;
  xp: number | null;
  gold: boolean;
  level: number;
  edition: number;
  tier: number | null;
}

export interface PlayerBattleCardInput extends BattleCardBase {
  winner: string;
  result: string; // "win" | "loss"
}

// No winner/result — opponent rows only stored on losses
export type OpponentBattleCardInput = BattleCardBase;

// ---------------------------------------------------------------------------
// Upserts
// ---------------------------------------------------------------------------

export async function upsertPlayerBattleCard(card: PlayerBattleCardInput): Promise<void> {
  const { battleId, account, position, ...rest } = card;
  await prisma.playerBattleCard.upsert({
    where: { battleId_account_position: { battleId, account, position } },
    create: { battleId, account, position, ...rest },
    update: rest,
  });
}

export async function upsertPlayerBattleCards(cards: PlayerBattleCardInput[]): Promise<void> {
  if (cards.length === 0) return;
  await prisma.$transaction(
    cards.map(({ battleId, account, position, ...rest }) =>
      prisma.playerBattleCard.upsert({
        where: { battleId_account_position: { battleId, account, position } },
        create: { battleId, account, position, ...rest },
        update: rest,
      })
    )
  );
}

export async function upsertOpponentBattleCard(card: OpponentBattleCardInput): Promise<void> {
  const { battleId, account, position, ...rest } = card;
  await prisma.opponentBattleCard.upsert({
    where: { battleId_account_position: { battleId, account, position } },
    create: { battleId, account, position, ...rest },
    update: rest,
  });
}

export async function upsertOpponentBattleCards(cards: OpponentBattleCardInput[]): Promise<void> {
  if (cards.length === 0) return;
  await prisma.$transaction(
    cards.map(({ battleId, account, position, ...rest }) =>
      prisma.opponentBattleCard.upsert({
        where: { battleId_account_position: { battleId, account, position } },
        create: { battleId, account, position, ...rest },
        update: rest,
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Cursors & utilities
// ---------------------------------------------------------------------------

/**
 * Returns the most recent createdDate stored in the player battles table for an account.
 * Used as a sync cursor so we only fetch battles newer than this.
 */
export async function getLatestPlayerBattleDate(account: string): Promise<Date | null> {
  const row = await prisma.playerBattleCard.findFirst({
    where: { account },
    orderBy: { createdDate: "desc" },
    select: { createdDate: true },
  });
  return row?.createdDate ?? null;
}

export async function getDistinctCardsByAccount(
  account: string
): Promise<{ cardDetailId: number; cardName: string }[]> {
  const rows = await prisma.playerBattleCard.findMany({
    where: { account },
    select: { cardDetailId: true, cardName: true },
    distinct: ["cardDetailId"],
    orderBy: { cardName: "asc" },
  });
  return rows.map((r) => ({ cardDetailId: r.cardDetailId, cardName: r.cardName }));
}

export async function deletePlayerBattleCardsByAccount(account: string): Promise<number> {
  const { count } = await prisma.playerBattleCard.deleteMany({ where: { account } });
  return count;
}

export async function deleteOpponentBattleCardsByAccount(account: string): Promise<number> {
  const { count } = await prisma.opponentBattleCard.deleteMany({ where: { account } });
  return count;
}

// ---------------------------------------------------------------------------
// Battle overview query filter
// ---------------------------------------------------------------------------

export interface BattleQueryFilter {
  account: string;
  formats: string[];
  cardTypes: string[];
  matchTypes: string[];
  rarities: number[];
  colors: string[];
  editions: number[]; // [] = all; native edition filter
  promoTiers: number[]; // [] = all; filters promo cards (edition=2) by era tier
  rewardTiers: number[]; // [] = all; filters reward cards (edition=3) by era tier
  extraTiers: number[]; // [] = all; filters extra cards (edition=17) by era tier
  minManaCap: number;
  maxManaCap: number;
  rulesets: string[];
  groupLevels: boolean;
  minBattleCount: number;
  sortBy: string;
  since?: string; // ISO date string — only include battles on or after this date
}

function buildPlayerWhere(filter: BattleQueryFilter): Prisma.PlayerBattleCardWhereInput {
  const AND: Prisma.PlayerBattleCardWhereInput[] = [{ account: filter.account }];
  if (filter.formats.length > 0) AND.push({ format: { in: filter.formats } });
  if (filter.cardTypes.length > 0) AND.push({ cardType: { in: filter.cardTypes } });
  if (filter.matchTypes.length > 0) AND.push({ matchType: { in: filter.matchTypes } });
  if (filter.rarities.length > 0) AND.push({ rarity: { in: filter.rarities } });
  if (filter.colors.length > 0) AND.push({ color: { in: filter.colors } });
  // Edition / tier filter: native editions, promo-era, reward-era — all OR-combined
  const editionConds: Prisma.PlayerBattleCardWhereInput[] = [];
  if (filter.editions.length > 0) editionConds.push({ edition: { in: filter.editions } });
  if (filter.promoTiers.length > 0)
    editionConds.push({ AND: [{ edition: 2 }, { tier: { in: filter.promoTiers } }] });
  if (filter.rewardTiers.length > 0)
    editionConds.push({ AND: [{ edition: 3 }, { tier: { in: filter.rewardTiers } }] });
  if (filter.extraTiers.length > 0)
    editionConds.push({ AND: [{ edition: 17 }, { tier: { in: filter.extraTiers } }] });
  if (editionConds.length === 1) AND.push(editionConds[0]);
  else if (editionConds.length > 1) AND.push({ OR: editionConds });
  if (filter.minManaCap > 0) AND.push({ manaCap: { gte: filter.minManaCap } });
  if (filter.maxManaCap > 0) AND.push({ manaCap: { lte: filter.maxManaCap } });
  if (filter.since) AND.push({ createdDate: { gte: new Date(filter.since) } });
  if (filter.rulesets.length > 0) {
    AND.push({
      OR: [
        { ruleset1: { in: filter.rulesets } },
        { ruleset2: { in: filter.rulesets } },
        { ruleset3: { in: filter.rulesets } },
      ],
    });
  }
  return { AND };
}

function buildOpponentWhere(filter: BattleQueryFilter): Prisma.OpponentBattleCardWhereInput {
  const AND: Prisma.OpponentBattleCardWhereInput[] = [{ account: filter.account }];
  if (filter.formats.length > 0) AND.push({ format: { in: filter.formats } });
  if (filter.matchTypes.length > 0) AND.push({ matchType: { in: filter.matchTypes } });
  if (filter.cardTypes.length > 0) AND.push({ cardType: { in: filter.cardTypes } });
  if (filter.rarities.length > 0) AND.push({ rarity: { in: filter.rarities } });
  if (filter.colors.length > 0) AND.push({ color: { in: filter.colors } });
  // Edition / tier filter: native editions, promo-era, reward-era, extra-era — all OR-combined
  const oppEditionConds: Prisma.OpponentBattleCardWhereInput[] = [];
  if (filter.editions.length > 0) oppEditionConds.push({ edition: { in: filter.editions } });
  if (filter.promoTiers.length > 0)
    oppEditionConds.push({ AND: [{ edition: 2 }, { tier: { in: filter.promoTiers } }] });
  if (filter.rewardTiers.length > 0)
    oppEditionConds.push({ AND: [{ edition: 3 }, { tier: { in: filter.rewardTiers } }] });
  if (filter.extraTiers.length > 0)
    oppEditionConds.push({ AND: [{ edition: 17 }, { tier: { in: filter.extraTiers } }] });
  if (oppEditionConds.length === 1) AND.push(oppEditionConds[0]);
  else if (oppEditionConds.length > 1) AND.push({ OR: oppEditionConds });
  if (filter.minManaCap > 0) AND.push({ manaCap: { gte: filter.minManaCap } });
  if (filter.maxManaCap > 0) AND.push({ manaCap: { lte: filter.maxManaCap } });
  if (filter.since) AND.push({ createdDate: { gte: new Date(filter.since) } });
  if (filter.rulesets.length > 0) {
    AND.push({
      OR: [
        { ruleset1: { in: filter.rulesets } },
        { ruleset2: { in: filter.rulesets } },
        { ruleset3: { in: filter.rulesets } },
      ],
    });
  }
  return { AND };
}

// ---------------------------------------------------------------------------
// Raw card aggregate types
// ---------------------------------------------------------------------------

export interface CardAgg {
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number; // max level seen
  gold: boolean; // true if any gold copy was played
  battles: number;
  wins: number;
  losses: number;
}

export interface LosingCardAgg {
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number;
  gold: boolean;
  battles: number;
}

// ---------------------------------------------------------------------------
// getBestCardStats — aggregate player battles by card
// ---------------------------------------------------------------------------

export async function getBestCardStats(filter: BattleQueryFilter): Promise<CardAgg[]> {
  const records = await prisma.playerBattleCard.findMany({
    where: buildPlayerWhere(filter),
    select: {
      cardDetailId: true,
      cardName: true,
      cardType: true,
      rarity: true,
      color: true,
      edition: true,
      level: true,
      gold: true,
      result: true,
    },
  });

  const map = new Map<
    string,
    {
      cardDetailId: number;
      cardName: string;
      cardType: string;
      rarity: number;
      color: string;
      edition: number;
      levelMax: number;
      hasGold: boolean;
      battles: number;
      wins: number;
      losses: number;
    }
  >();

  for (const r of records) {
    const key = filter.groupLevels
      ? `${r.cardDetailId}|${r.edition}`
      : `${r.cardDetailId}|${r.edition}|${r.level}`;

    if (!map.has(key)) {
      map.set(key, {
        cardDetailId: r.cardDetailId,
        cardName: r.cardName,
        cardType: r.cardType,
        rarity: r.rarity,
        color: r.color,
        edition: r.edition,
        levelMax: r.level,
        hasGold: r.gold,
        battles: 0,
        wins: 0,
        losses: 0,
      });
    }

    const entry = map.get(key)!;
    entry.battles++;
    if (r.level > entry.levelMax) {
      entry.levelMax = r.level;
      entry.hasGold = r.gold;
    }
    if (r.result === "win") entry.wins++;
    else entry.losses++;
  }

  return Array.from(map.values())
    .filter((e) => e.battles >= filter.minBattleCount)
    .map((e) => ({
      cardDetailId: e.cardDetailId,
      cardName: e.cardName,
      cardType: e.cardType,
      rarity: e.rarity,
      color: e.color,
      edition: e.edition,
      level: e.levelMax,
      gold: e.hasGold,
      battles: e.battles,
      wins: e.wins,
      losses: e.losses,
    }));
}

// ---------------------------------------------------------------------------
// getLosingCardStats — aggregate opponent battles (cards that beat the player)
// ---------------------------------------------------------------------------

export async function getLosingCardStats(filter: BattleQueryFilter): Promise<LosingCardAgg[]> {
  const records = await prisma.opponentBattleCard.findMany({
    where: buildOpponentWhere(filter),
    select: {
      cardDetailId: true,
      cardName: true,
      cardType: true,
      rarity: true,
      color: true,
      edition: true,
      level: true,
      gold: true,
    },
  });

  const map = new Map<
    string,
    {
      cardDetailId: number;
      cardName: string;
      cardType: string;
      rarity: number;
      color: string;
      edition: number;
      levelMax: number;
      hasGold: boolean;
      battles: number;
    }
  >();

  for (const r of records) {
    const key = filter.groupLevels
      ? `${r.cardDetailId}|${r.edition}`
      : `${r.cardDetailId}|${r.edition}|${r.level}`;

    if (!map.has(key)) {
      map.set(key, {
        cardDetailId: r.cardDetailId,
        cardName: r.cardName,
        cardType: r.cardType,
        rarity: r.rarity,
        color: r.color,
        edition: r.edition,
        levelMax: r.level,
        hasGold: r.gold,
        battles: 0,
      });
    }

    const entry = map.get(key)!;
    entry.battles++;
    if (r.level > entry.levelMax) {
      entry.levelMax = r.level;
      entry.hasGold = r.gold;
    }
  }

  return Array.from(map.values())
    .filter((e) => e.battles >= filter.minBattleCount)
    .map((e) => ({
      cardDetailId: e.cardDetailId,
      cardName: e.cardName,
      cardType: e.cardType,
      rarity: e.rarity,
      color: e.color,
      edition: e.edition,
      level: e.levelMax,
      gold: e.hasGold,
      battles: e.battles,
    }));
}

// ---------------------------------------------------------------------------
// getCardDetailBattles — all battle records for a specific card
// ---------------------------------------------------------------------------

export interface CardBattleRecord {
  battleId: string;
  createdDate: Date;
  format: string;
  matchType: string;
  manaCap: number;
  ruleset1: string;
  ruleset2: string;
  ruleset3: string;
  result: string;
  winner: string;
  opponent: string;
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number;
  gold: boolean;
}

export async function getCardDetailBattles(
  cardDetailId: number,
  filter: BattleQueryFilter
): Promise<CardBattleRecord[]> {
  const where = buildPlayerWhere(filter);
  // Merge cardDetailId into the where clause
  const mergedWhere: Prisma.PlayerBattleCardWhereInput = {
    AND: [where, { cardDetailId }],
  };

  return prisma.playerBattleCard.findMany({
    where: mergedWhere,
    select: {
      battleId: true,
      createdDate: true,
      format: true,
      matchType: true,
      manaCap: true,
      ruleset1: true,
      ruleset2: true,
      ruleset3: true,
      result: true,
      winner: true,
      opponent: true,
      cardDetailId: true,
      cardName: true,
      cardType: true,
      rarity: true,
      color: true,
      edition: true,
      level: true,
      gold: true,
    },
    orderBy: { createdDate: "desc" },
  });
}

// ---------------------------------------------------------------------------
// getPairedCards — cards most often played together with a given card
// ---------------------------------------------------------------------------

export async function getPairedCards(
  account: string,
  battleIds: string[],
  excludeCardDetailId: number
): Promise<CardAgg[]> {
  if (battleIds.length === 0) return [];

  const records = await prisma.playerBattleCard.findMany({
    where: {
      account,
      battleId: { in: battleIds },
      cardDetailId: { not: excludeCardDetailId },
    },
    select: {
      cardDetailId: true,
      cardName: true,
      cardType: true,
      rarity: true,
      color: true,
      edition: true,
      level: true,
      gold: true,
      result: true,
    },
  });

  const map = new Map<
    string,
    {
      cardDetailId: number;
      cardName: string;
      cardType: string;
      rarity: number;
      color: string;
      edition: number;
      levelMax: number;
      hasGold: boolean;
      battles: number;
      wins: number;
      losses: number;
    }
  >();

  for (const r of records) {
    const key = `${r.cardDetailId}|${r.edition}`;
    if (!map.has(key)) {
      map.set(key, {
        cardDetailId: r.cardDetailId,
        cardName: r.cardName,
        cardType: r.cardType,
        rarity: r.rarity,
        color: r.color,
        edition: r.edition,
        levelMax: r.level,
        hasGold: r.gold,
        battles: 0,
        wins: 0,
        losses: 0,
      });
    }
    const e = map.get(key)!;
    e.battles++;
    if (r.level > e.levelMax) {
      e.levelMax = r.level;
      e.hasGold = r.gold;
    }
    if (r.result === "win") e.wins++;
    else e.losses++;
  }

  return Array.from(map.values())
    .sort((a, b) => b.battles - a.battles)
    .map((e) => ({
      cardDetailId: e.cardDetailId,
      cardName: e.cardName,
      cardType: e.cardType,
      rarity: e.rarity,
      color: e.color,
      edition: e.edition,
      level: e.levelMax,
      gold: e.hasGold,
      battles: e.battles,
      wins: e.wins,
      losses: e.losses,
    }));
}

// ---------------------------------------------------------------------------
// getNemesisCards — opponent cards in battles the player lost
// ---------------------------------------------------------------------------

export async function getNemesisCards(
  account: string,
  losingBattleIds: string[]
): Promise<LosingCardAgg[]> {
  if (losingBattleIds.length === 0) return [];

  const records = await prisma.opponentBattleCard.findMany({
    where: {
      account,
      battleId: { in: losingBattleIds },
    },
    select: {
      cardDetailId: true,
      cardName: true,
      cardType: true,
      rarity: true,
      color: true,
      edition: true,
      level: true,
      gold: true,
    },
  });

  const map = new Map<
    string,
    {
      cardDetailId: number;
      cardName: string;
      cardType: string;
      rarity: number;
      color: string;
      edition: number;
      levelMax: number;
      hasGold: boolean;
      battles: number;
    }
  >();

  for (const r of records) {
    const key = `${r.cardDetailId}|${r.edition}`;
    if (!map.has(key)) {
      map.set(key, {
        cardDetailId: r.cardDetailId,
        cardName: r.cardName,
        cardType: r.cardType,
        rarity: r.rarity,
        color: r.color,
        edition: r.edition,
        levelMax: r.level,
        hasGold: r.gold,
        battles: 0,
      });
    }
    const e = map.get(key)!;
    e.battles++;
    if (r.level > e.levelMax) {
      e.levelMax = r.level;
      e.hasGold = r.gold;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.battles - a.battles)
    .map((e) => ({
      cardDetailId: e.cardDetailId,
      cardName: e.cardName,
      cardType: e.cardType,
      rarity: e.rarity,
      color: e.color,
      edition: e.edition,
      level: e.levelMax,
      gold: e.hasGold,
      battles: e.battles,
    }));
}

// ---------------------------------------------------------------------------
// getDistinctRulesets — for filter autocomplete
// ---------------------------------------------------------------------------

export async function getDistinctRulesets(account: string): Promise<string[]> {
  const [r1, r2, r3] = await Promise.all([
    prisma.playerBattleCard.findMany({
      where: { account },
      select: { ruleset1: true },
      distinct: ["ruleset1"],
    }),
    prisma.playerBattleCard.findMany({
      where: { account },
      select: { ruleset2: true },
      distinct: ["ruleset2"],
    }),
    prisma.playerBattleCard.findMany({
      where: { account },
      select: { ruleset3: true },
      distinct: ["ruleset3"],
    }),
  ]);

  const rulesets = new Set<string>();
  r1.forEach((r) => {
    if (r.ruleset1 && r.ruleset1 !== "None") rulesets.add(r.ruleset1);
  });
  r2.forEach((r) => {
    if (r.ruleset2 && r.ruleset2 !== "None") rulesets.add(r.ruleset2);
  });
  r3.forEach((r) => {
    if (r.ruleset3 && r.ruleset3 !== "None") rulesets.add(r.ruleset3);
  });

  return Array.from(rulesets).sort();
}

// ---------------------------------------------------------------------------
// hasBattleData — check if account has any battle records
// ---------------------------------------------------------------------------

export async function hasBattleData(account: string): Promise<boolean> {
  const row = await prisma.playerBattleCard.findFirst({
    where: { account },
    select: { id: true },
  });
  return row !== null;
}

// ---------------------------------------------------------------------------
// getBattleTeams — all player and opponent cards for given battle IDs
// ---------------------------------------------------------------------------

export interface BattleTeamRow {
  battleId: string;
  position: number;
  cardDetailId: number;
  cardName: string;
  cardType: string;
  level: number;
  edition: number;
  gold: boolean;
  owner: "player" | "opponent";
}

export async function getBattleTeams(
  account: string,
  battleIds: string[]
): Promise<BattleTeamRow[]> {
  if (battleIds.length === 0) return [];

  const [playerCards, opponentCards] = await Promise.all([
    prisma.playerBattleCard.findMany({
      where: { account, battleId: { in: battleIds } },
      select: {
        battleId: true,
        position: true,
        cardDetailId: true,
        cardName: true,
        cardType: true,
        level: true,
        edition: true,
        gold: true,
      },
      orderBy: { position: "asc" },
    }),
    prisma.opponentBattleCard.findMany({
      where: { account, battleId: { in: battleIds } },
      select: {
        battleId: true,
        position: true,
        cardDetailId: true,
        cardName: true,
        cardType: true,
        level: true,
        edition: true,
        gold: true,
      },
      orderBy: { position: "asc" },
    }),
  ]);

  return [
    ...playerCards.map((c) => ({ ...c, owner: "player" as const })),
    ...opponentCards.map((c) => ({ ...c, owner: "opponent" as const })),
  ];
}

// ---------------------------------------------------------------------------
// Nemesis opponent stats — who beats a given account most often
// ---------------------------------------------------------------------------

export interface NemesisRawRow {
  opponent: string;
  format: string;
  matchType: string;
}

/**
 * Returns one entry per distinct loss battle for the account.
 * Deduplicates by battleId so multiple cards per battle don't inflate counts.
 */
export async function getNemesisOpponentStats(
  account: string,
  since?: string
): Promise<NemesisRawRow[]> {
  const rows = await prisma.playerBattleCard.findMany({
    where: {
      account,
      result: "loss",
      ...(since ? { createdDate: { gte: new Date(since) } } : {}),
    },
    select: {
      battleId: true,
      opponent: true,
      format: true,
      matchType: true,
    },
    distinct: ["battleId"],
  });
  return rows.map((r) => ({
    opponent: r.opponent,
    format: r.format,
    matchType: r.matchType,
  }));
}
