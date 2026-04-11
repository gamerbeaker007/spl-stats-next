import { fetchBattleHistory, fetchCardDetails } from "@/lib/backend/api/spl/spl-api";
import { decryptToken } from "@/lib/backend/auth/encryption";
import {
  getLatestPlayerBattleDate,
  upsertOpponentBattleCards,
  upsertPlayerBattleCards,
  type OpponentBattleCardInput,
  type PlayerBattleCardInput,
} from "@/lib/backend/db/battle-cards";
import logger from "@/lib/backend/log/logger.server";
import type { SplBattle, SplBattleCard } from "@/types/spl/battle";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import { shouldShutdown } from "./graceful-shutdown";
import { REQUEST_DELAY_MS } from "./worker-config";

interface AccountCredentials {
  username: string;
  encryptedToken: string;
  iv: string;
  authTag: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Card-detail lookup (fetched once per worker cycle)
// ---------------------------------------------------------------------------

type CardMap = Map<number, SplCardDetail>;

let cachedCardMap: CardMap | null = null;
let cardMapFetchedAt = 0;
const CARD_MAP_TTL_MS = 24 * 60 * 60 * 1000; // refresh once a day

async function getCardMap(): Promise<CardMap> {
  const now = Date.now();
  if (cachedCardMap && now - cardMapFetchedAt < CARD_MAP_TTL_MS) {
    return cachedCardMap;
  }
  logger.info("battleHistorySync: fetching card details");
  const details = await fetchCardDetails();
  const map: CardMap = new Map(details.map((d) => [d.id, d]));
  cachedCardMap = map;
  cardMapFetchedAt = now;
  return map;
}

// ---------------------------------------------------------------------------
// Environment: optional account filter
// ---------------------------------------------------------------------------

/**
 * Returns the set of account names that should be synced.
 * When BATTLE_SYNC_ACCOUNTS is not set (or empty), returns null → sync all.
 */
export function getBattleSyncAccountFilter(): Set<string> | null {
  const raw = process.env.BATTLE_SYNC_ACCOUNTS;
  if (!raw || raw.trim() === "") return null;
  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return names.length > 0 ? new Set(names) : null;
}

// ---------------------------------------------------------------------------
// Processing helpers (ported from Python battle_store.py)
// ---------------------------------------------------------------------------

function isSurrender(battle: SplBattle): boolean {
  return battle.details?.type === "Surrender";
}

function isTraining(battle: SplBattle): boolean {
  try {
    const settings = JSON.parse(battle.settings ?? "{}");
    return battle.match_type === "Challenge" && settings.is_training === "true";
  } catch {
    return false;
  }
}

/** Normalise format — null/absent on the API means wild. */
function resolveFormat(battle: SplBattle): string {
  return battle.format ?? "wild";
}

function splitRulesets(ruleset: string): [string, string, string] {
  const parts = (ruleset ?? "").split("|");
  return [parts[0] ?? "None", parts[1] ?? "None", parts[2] ?? "None"];
}

function cardFields(card: SplBattleCard, cardMap: CardMap, position: number) {
  const detail = cardMap.get(card.card_detail_id);
  return {
    position,
    cardDetailId: card.card_detail_id,
    cardName: detail?.name ?? `Card #${card.card_detail_id}`,
    cardType: detail?.type ?? "Unknown",
    rarity: detail?.rarity ?? 0,
    color: detail?.color ?? "",
    secondaryColor: detail?.secondary_color ?? null,
    xp: card.xp ?? null,
    gold: card.gold,
    level: card.level,
    edition: card.edition,
    tier: detail?.tier ?? null,
  };
}

interface ProcessedBattle {
  playerCards: PlayerBattleCardInput[];
  opponentCards: OpponentBattleCardInput[];
}

function processBattle(account: string, battle: SplBattle, cardMap: CardMap): ProcessedBattle {
  const format = resolveFormat(battle);
  const [ruleset1, ruleset2, ruleset3] = splitRulesets(battle.ruleset);
  const battleId = battle.battle_queue_id_1;
  const createdDate = new Date(battle.created_date);
  const opponent =
    battle.player_1.toLowerCase() === account.toLowerCase() ? battle.player_2 : battle.player_1;

  let matchType = battle.match_type;
  if (battle.details?.is_brawl) matchType = "Brawl";

  const winner = battle.details?.winner ?? battle.winner;
  const result = winner?.toLowerCase() === account.toLowerCase() ? "win" : "loss";

  const sharedBase = {
    battleId,
    account,
    opponent,
    createdDate,
    matchType,
    format,
    manaCap: battle.mana_cap,
    ruleset1,
    ruleset2,
    ruleset3,
    inactive: battle.inactive ?? "",
  };

  const myTeam =
    battle.details.team1.player.toLowerCase() === account.toLowerCase()
      ? battle.details.team1
      : battle.details.team2;
  const opponentTeam =
    battle.details.team1.player.toLowerCase() === account.toLowerCase()
      ? battle.details.team2
      : battle.details.team1;

  // Player's own cards
  const myCards = [...myTeam.monsters, myTeam.summoner];
  const playerCards: PlayerBattleCardInput[] = myCards.map((card, i) => ({
    ...sharedBase,
    winner,
    result,
    ...cardFields(card, cardMap, i),
  }));

  // Opponent cards — only on losses (wins fetch opponent team live from the API when needed)
  const opponentCards: OpponentBattleCardInput[] =
    result === "loss"
      ? [...opponentTeam.monsters, opponentTeam.summoner].map((card, i) => ({
          ...sharedBase,
          ...cardFields(card, cardMap, i),
        }))
      : [];

  return { playerCards, opponentCards };
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Fetch and store battle history for one account.
 * Only processes battles newer than the latest stored battle for that account.
 * The env var BATTLE_SYNC_ACCOUNTS (comma-separated) restricts which accounts are synced.
 */
export async function syncBattleHistory(
  account: AccountCredentials,
  tokenDecrypted: string
): Promise<void> {
  const filter = getBattleSyncAccountFilter();
  if (filter && !filter.has(account.username.toLowerCase())) {
    logger.info(`battleHistorySync: skipping ${account.username} (not in BATTLE_SYNC_ACCOUNTS)`);
    return;
  }

  logger.info(`battleHistorySync: starting for ${account.username}`);

  const cardMap = await getCardMap();

  const battles = await fetchBattleHistory(account.username, tokenDecrypted, 50);

  if (battles.length === 0) {
    logger.info(`battleHistorySync: no battles returned for ${account.username}`);
    return;
  }

  // Find the latest already-stored created_date for this account to skip already-processed battles
  const latestDate = await getLatestPlayerBattleDate(account.username);

  const toProcess = latestDate
    ? battles.filter((b) => new Date(b.created_date) > latestDate)
    : battles;

  const count = toProcess.length;
  if (count === 50) {
    logger.info(
      `battleHistorySync: ${account.username} — 50+ battles to process (API limit reached)`
    );
  } else {
    logger.info(`battleHistorySync: ${account.username} — ${count} battles to process`);
  }

  if (count === 0) {
    logger.info(`battleHistorySync: ${account.username} — already up to date`);
    return;
  }

  let processed = 0;
  for (const battle of toProcess) {
    if (shouldShutdown()) return;

    if (isSurrender(battle) || isTraining(battle)) {
      logger.info(
        `battleHistorySync: skipping surrender/training battle ${battle.battle_queue_id_1}`
      );
      continue;
    }

    try {
      const { playerCards, opponentCards } = processBattle(account.username, battle, cardMap);
      await upsertPlayerBattleCards(playerCards);
      if (opponentCards.length > 0) {
        await upsertOpponentBattleCards(opponentCards);
      }
      processed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        `battleHistorySync: error on battle ${battle.battle_queue_id_1} for ${account.username}: ${msg}`
      );
    }

    await delay(REQUEST_DELAY_MS);
  }

  logger.info(`battleHistorySync: ${account.username} — done (${processed}/${count} written)`);
}
