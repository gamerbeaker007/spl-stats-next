"use server";

import {
  fetchCardDetails,
  fetchPlayerTournamentIds,
  fetchPlayerHistoryByDateRange,
  fetchTournament,
} from "@/lib/backend/api/spl/spl-api";
import { buildMarketData } from "@/lib/backend/services/hive-blog-market";
import { fetchMarketLanding } from "@/lib/backend/api/spl/vapi-spl";
import { getCardImageByLevel, getSkinImageUrl } from "@/lib/shared/card-image-utils";
import { decryptToken } from "@/lib/backend/auth/encryption";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getPlayerLeaderboardForSeason } from "@/lib/backend/db/player-leaderboard";
import { getSeasonBalances } from "@/lib/backend/db/season-balances";
import { getSeasonById, getLatestSeason } from "@/lib/backend/db/seasons";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";
import {
  aggregatePurchaseRewards,
  aggregateRewards,
  mergeRewardSummaries,
} from "@/lib/rewardAggregator";
import { leagueNames } from "@/lib/utils";
import { ParsedHistory, PurchaseResult, RewardSummary } from "@/types/parsedHistory";
import type {
  HiveBlogAccountData,
  HiveBlogEarningsDetailRow,
  HiveBlogMarketCard,
  HiveBlogMarketItem,
  HiveBlogPost,
  HiveBlogRewardSummary,
  HiveBlogResult,
  HiveBlogTournamentRow,
} from "@/types/hive-blog";
import {
  credits_icon_url,
  dec_icon_url,
  energy_icon_url,
  foundation_entries_icon_url,
  glint_icon_url,
  gold_icon_url,
  legendary_icon_url,
  merits_icon_url,
  other_icon_url,
  pack_beta_icon_url,
  pack_chaos_icon_url,
  pack_foundations_icon_url,
  pack_rift_icon_url,
  ranked_entries_icon_url,
  reward_draw_common_icon_url,
  reward_draw_epic_icon_url,
  reward_draw_legendary_icon_url,
  reward_draw_major_icon_url,
  reward_draw_minor_icon_url,
  reward_draw_rare_icon_url,
  reward_draw_ultimate_icon_url,
  spl_logo_icon_url,
  splinterlands_statistics_icon_url,
  sps_icon_url,
  unbind_ca_c_icon_url,
  unbind_ca_e_icon_url,
  unbind_ca_l_icon_url,
  unbind_ca_r_icon_url,
  voucher_icon_url,
  WEB_URL,
} from "@/lib/staticsIconUrls";

const HEADER = "# <div class=phishy>";
const SUB_HEADER = "## <div class=phishy>";
const CLOSE_HEADER = "</div>";
// ---------------------------------------------------------------------------
// Icon helpers (Hive image proxy)
// ---------------------------------------------------------------------------

const PROXY20 = "https://images.hive.blog/20x0/";
const PROXY50 = "https://images.hive.blog/50x0/";
const PROXY150 = "https://images.hive.blog/150x0/";

function img(url: string, size: number = 20): string {
  const proxyUrl = PROXY20.replace("20", String(size));
  return `![](${proxyUrl}${url})`;
}

const TOKEN_ICONS: Record<string, string> = {
  DEC: img(dec_icon_url),
  "DEC-B": img(dec_icon_url),
  SPS: img(sps_icon_url),
  SPSP: img(sps_icon_url),
  UNCLAIMED_SPS: img(sps_icon_url),
  MERITS: img(merits_icon_url),
  VOUCHER: img(voucher_icon_url),
  "VOUCHER-G": img(voucher_icon_url),
  GLINT: img(glint_icon_url),
  CREDITS: img(credits_icon_url),
  UNCLAIMED_VOUCHER: img(voucher_icon_url),
};

function tokenIcon(token: string): string {
  return TOKEN_ICONS[token] ?? img(other_icon_url);
}

// ---------------------------------------------------------------------------
// Earnings label mapping: (token, type) → human label
// ---------------------------------------------------------------------------

const EARNINGS_LABELS: Record<string, Record<string, string>> = {
  DEC: {
    earn_rental_payment: "DEC rental income",
    sell_market_purchase: "DEC card market sale",
    tournament_prize: "DEC tournament prize",
    modern_leaderboard_prizes: "DEC modern leaderboard",
    leaderboard_prizes: "DEC wild leaderboard",
    cost_rental_payment: "DEC rental payments",
    rental_payment_fees: "DEC rental fees",
    enter_tournament: "DEC tournament entry fee",
    market_rental: "DEC market rental",
    purchased_energy: "DEC purchased energy",
    buy_market_purchase: "DEC market buy",
    market_fees: "DEC market fees",
    market_list_fee: "DEC market list fee",
  },
  "DEC-B": {
    earn_rental_payment: "DEC-B rental income",
    sell_market_purchase: "DEC-B card market sale",
    buy_market_purchase: "DEC-B market buy",
  },
  SPS: {
    tournament_prize: "SPS tournament prize",
    token_transfer_multi: "SPS tournament (multi-token)",
    claim_staking_rewards: "SPS staking reward",
    claim_staking_rewards_staking_rewards: "SPS staking reward",
    claim_staking_rewards_validator_rewards: "SPS validator reward",
    validate_block: "SPS block validation",
    token_award: "SPS pool award",
    enter_tournament: "SPS tournament entry fee",
    delegation_modern: "SPS ranked (modern) fee",
    delegation_wild: "SPS ranked (wild) fee",
    delegation_focus: "SPS daily focus fee",
    delegation_season: "SPS season fee",
    delegation_land: "SPS land fee",
    delegation_nightmare: "SPS nightmare fee",
    delegation_brawl: "SPS brawl delegation",
  },
  UNCLAIMED_SPS: {
    modern: "SPS ranked battle (modern)",
    wild: "SPS ranked battle (wild)",
    survival: "SPS survival battle",
    survival_bracket: "SPS survival bracket",
    focus: "SPS daily focus",
    season: "SPS season reward",
    land: "SPS land reward",
    nightmare: "SPS nightmare (TD)",
    brawl: "SPS brawl reward",
  },
  MERITS: {
    quest_rewards: "Merits quest reward",
    season_rewards: "Merits season reward",
    brawl_prize: "Merits brawl prize",
  },
  VOUCHER: { claim_staking_rewards: "Voucher staking reward" },
  "VOUCHER-G": { claim_staking_rewards: "Voucher staking reward" },
  UNCLAIMED_VOUCHER: {
    modern: "Voucher ranked battle (modern)",
    wild: "Voucher ranked battle (wild)",
    focus: "Voucher daily focus",
    season: "Voucher season reward",
  },
  GLINT: {
    ranked_rewards: "Glint ranked reward",
    season_rewards: "Glint season reward",
    purchase_reward_draw: "Glint reward draw spend",
  },
  CREDITS: {
    sell_market_purchase: "Credits card market sale",
    buy_market_purchase: "Credits market buy",
    claim_staking_rewards: "Credits staking reward",
  },
};

function earningsLabel(token: string, type: string): string {
  return EARNINGS_LABELS[token]?.[type] ?? `${token} ${type.replace(/_/g, " ")}`;
}

// ---------------------------------------------------------------------------
// League icon helpers
// ---------------------------------------------------------------------------

function leagueIconMd(format: string, leagueNum: number | null): string {
  if (leagueNum == null) return "";
  const folder = format === "modern" ? "modern_150" : "wild_150";
  const url = `${WEB_URL}website/icons/leagues/${folder}/league_${leagueNum}.png`;
  return img(url, 75);
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getToken(username: string): Promise<string | undefined> {
  const creds = await getSplAccountCredentials(username);
  if (!creds) return undefined;
  return decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
}

// ---------------------------------------------------------------------------
// Account list for selector
// ---------------------------------------------------------------------------

export async function getMonitoredAccountsForBlogAction(): Promise<string[]> {
  const accounts = await getMonitoredAccounts();
  return accounts.map((a) => a.username);
}

export async function fetchMarketHistoryTestAction(
  username: string,
  days: number = 30
): Promise<{ entries: unknown[]; error?: string }> {
  const token = await getToken(username);
  if (!token) return { entries: [], error: "No SPL token found for this account" };
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const { fetchMarketHistoryByDateRange } = await import("@/lib/backend/api/spl/spl-api");
    const entries = await fetchMarketHistoryByDateRange(username, token, startDate, endDate);
    return { entries };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "Fetch failed" };
  }
}

export async function fetchRewardSkinsAndMusicTestAction(
  username: string,
  days: number = 30
): Promise<{
  skins: Array<{
    skinDetailId: number;
    skin: string;
    cardDetailId: number;
    cardName: string;
    imageUrl: string;
    quantity: number;
  }>;
  music: Array<{ musicDetailId: number; name: string; imageUrl: string; quantity: number }>;
  error?: string;
}> {
  const empty = { skins: [], music: [] };
  const token = await getToken(username);
  if (!token) return { ...empty, error: "No SPL token found for this account" };
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const { fetchPlayerHistoryByDateRange } = await import("@/lib/backend/api/spl/spl-api");
    const allHistory = await fetchPlayerHistoryByDateRange(
      username,
      token,
      "claim_reward,claim_daily,purchase",
      startDate,
      endDate
    );
    const purchaseEntries = allHistory
      .filter(
        (e): e is ParsedHistory & { type: "purchase"; result: PurchaseResult } =>
          e.type === "purchase" && e.result !== null
      )
      .map((e) => e.result as PurchaseResult);

    const agg = mergeRewardSummaries(
      aggregateRewards(allHistory),
      aggregatePurchaseRewards(purchaseEntries)
    );

    let cardDetailsMap: Map<number, string> = new Map();
    try {
      const allCards = await fetchCardDetails();
      cardDetailsMap = new Map(allCards.map((c) => [c.id, c.name]));
    } catch {
      // non-fatal
    }

    const landingAssets = await fetchMarketLanding(username).catch(() => []);
    const landingByDetailId = new Map(landingAssets.map((a) => [a.detailId, a]));

    const skins = Object.entries(agg.totalSkins).map(([idStr, data]) => {
      const cardName = cardDetailsMap.get(data.cardDetailId) ?? `Card #${data.cardDetailId}`;
      const landingAsset = landingByDetailId.get(idStr);
      const imageUrl = landingAsset?.detailImage ?? getSkinImageUrl(cardName, data.skin);
      return {
        skinDetailId: Number(idStr),
        skin: data.skin,
        cardDetailId: data.cardDetailId,
        cardName,
        imageUrl,
        quantity: data.quantity,
      };
    });

    const music = Object.entries(agg.totalMusic).map(([idStr, data]) => {
      const landingAsset = landingByDetailId.get(idStr);
      const imageUrl = landingAsset?.detailImage ?? "";
      const name = landingAsset?.detailName ?? data.name;
      return { musicDetailId: Number(idStr), name, imageUrl, quantity: data.quantity };
    });

    return { skins, music };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "Fetch failed" };
  }
}

export async function fetchResolvedMarketDataTestAction(
  username: string,
  days: number = 30
): Promise<{
  boughtCards: HiveBlogMarketCard[];
  soldCards: HiveBlogMarketCard[];
  boughtItems: HiveBlogMarketItem[];
  soldItems: HiveBlogMarketItem[];
  error?: string;
}> {
  const empty = { boughtCards: [], soldCards: [], boughtItems: [], soldItems: [] };
  const token = await getToken(username);
  if (!token) return { ...empty, error: "No SPL token found for this account" };
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    let cardDetailsMap: Map<number, string> = new Map();
    try {
      const allCards = await fetchCardDetails();
      cardDetailsMap = new Map(allCards.map((c) => [c.id, c.name]));
    } catch {
      // non-fatal — cards will show as "Card #N"
    }
    return await buildMarketData(username, startDate, endDate, cardDetailsMap, token);
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "Fetch failed" };
  }
}

// ---------------------------------------------------------------------------
// Blog generation
// ---------------------------------------------------------------------------

export async function generateHiveBlogAction(
  selectedAccounts: string[],
  mode: "combined" | "separate" = "combined"
): Promise<HiveBlogResult> {
  if (selectedAccounts.length === 0) throw new Error("No accounts selected");

  const latestSeason = await getLatestSeason();
  if (!latestSeason) throw new Error("No season data found in database");

  const previousSeasonId = latestSeason.id - 1;

  // Fetch season date range for API calls
  const [prevSeason, prevPrevSeason] = await Promise.all([
    getSeasonById(previousSeasonId),
    getSeasonById(previousSeasonId - 1),
  ]);

  const seasonEnd = prevSeason ? new Date(prevSeason.endsAt) : new Date();
  const seasonStart = prevPrevSeason ? new Date(prevPrevSeason.endsAt) : new Date(0);

  // Fetch card details once — reused for earned reward cards
  let cardDetailsMap: Map<number, string> = new Map();
  try {
    const allCards = await fetchCardDetails();
    cardDetailsMap = new Map(allCards.map((c) => [c.id, c.name]));
  } catch {
    // non-fatal
  }

  const missingAccounts: string[] = [];
  const unclaimedRewardAccounts: string[] = [];
  const accounts: HiveBlogAccountData[] = [];

  for (const username of selectedAccounts) {
    const [leaderboardRows, token, seasonRows] = await Promise.all([
      getPlayerLeaderboardForSeason(username, previousSeasonId),
      getToken(username),
      getSeasonBalances(username, previousSeasonId),
    ]);

    // Warn if GLINT season_rewards is absent — rewards may be unclaimed or not yet synced
    const hasGlintSeasonRewards = seasonRows.some(
      (r) => r.token === "GLINT" && r.type === "season_rewards" && r.amount > 0
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

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

function buildDetailedEarnings(
  rows: Awaited<ReturnType<typeof getSeasonBalances>>
): { earned: HiveBlogEarningsDetailRow[]; costs: HiveBlogEarningsDetailRow[] } {
  const map = new Map<string, { token: string; type: string; amount: number }>();
  for (const row of rows) {
    const key = `${row.token}:${row.type}`;
    if (!map.has(key)) map.set(key, { token: row.token, type: row.type, amount: 0 });
    map.get(key)!.amount += row.amount;
  }

  const earned: HiveBlogEarningsDetailRow[] = [];
  const costs: HiveBlogEarningsDetailRow[] = [];

  for (const { token, type, amount } of map.values()) {
    if (amount === 0) continue;
    const label = earningsLabel(token, type);
    const icon = tokenIcon(token);
    if (amount > 0) earned.push({ label, icon, amount, isEarned: true });
    else costs.push({ label, icon, amount: Math.abs(amount), isEarned: false });
  }

  earned.sort((a, b) => b.amount - a.amount);
  costs.sort((a, b) => b.amount - a.amount);
  return { earned, costs };
}

// ---------------------------------------------------------------------------
// Reward history (SPL API — requires token)
// ---------------------------------------------------------------------------

async function buildRewardSummary(
  username: string,
  seasonId: number,
  startDate: Date,
  endDate: Date,
  token: string | undefined,
  cardDetailsMap: Map<number, string>
): Promise<HiveBlogRewardSummary | null> {
  if (!token) return null;
  try {
    const REWARD_TYPES = "claim_reward,claim_daily,purchase";
    const allHistory: ParsedHistory[] = await fetchPlayerHistoryByDateRange(
      username,
      token,
      REWARD_TYPES,
      startDate,
      endDate
    );

    const purchaseEntries = allHistory
      .filter(
        (e): e is ParsedHistory & { type: "purchase"; result: PurchaseResult } =>
          e.type === "purchase" && e.result !== null
      )
      .map((e) => e.result as PurchaseResult);

    const agg: RewardSummary = mergeRewardSummaries(
      aggregateRewards(allHistory),
      aggregatePurchaseRewards(purchaseEntries)
    );

    // Resolve card IDs to names using the shared card details map
    const earnedCards: HiveBlogMarketCard[] = Object.entries(agg.totalCards)
      .map(([idStr, data]) => {
        const id = Number(idStr);
        const name = cardDetailsMap.get(id) ?? `Card #${id}`;
        const foilCounts: HiveBlogMarketCard["foilCounts"] = {};
        if (data.regular > 0) foilCounts["regular"] = data.regular;
        if (data.gold > 0) foilCounts["gold"] = data.gold;
        return { name, edition: data.edition, foilCounts };
      })
      .filter((c) => Object.values(c.foilCounts).some((v) => (v ?? 0) > 0))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Fetch market landing to resolve skin/music images
    const landingAssets = await fetchMarketLanding(username).catch(() => []);
    const landingByDetailId = new Map(landingAssets.map((a) => [a.detailId, a]));

    const earnedSkins = Object.entries(agg.totalSkins).map(([idStr, data]) => {
      const cardName = cardDetailsMap.get(data.cardDetailId) ?? `Card #${data.cardDetailId}`;
      // Try market landing image first, fall back to getSkinImageUrl
      const landingAsset = landingByDetailId.get(String(idStr));
      const imageUrl = landingAsset?.detailImage ?? getSkinImageUrl(cardName, data.skin);
      return { skinName: data.skin, cardName, imageUrl, quantity: data.quantity };
    });

    const earnedMusic = Object.entries(agg.totalMusic).map(([idStr, data]) => {
      const landingAsset = landingByDetailId.get(String(idStr));
      const imageUrl = landingAsset?.detailImage ?? "";
      const name = landingAsset?.detailName ?? data.name;
      return { name, imageUrl, quantity: data.quantity };
    });

    return {
      minor: agg.totalDraws.minor,
      major: agg.totalDraws.major,
      ultimate: agg.totalDraws.ultimate,
      potions: agg.totalPotions,
      potionsUsed: agg.totalPotionsUsed,
      merits: agg.totalMerits,
      energy: agg.totalEnergy,
      scrolls: agg.totalScrolls,
      packs: agg.totalPacks,
      frontierEntries: agg.totalFrontierEntries,
      rankedEntries: agg.totalRankedEntries,
      earnedCards,
      earnedSkins,
      earnedMusic,
      shopChestMinor: agg.totalShopPurchases.chests.minor,
      shopChestMajor: agg.totalShopPurchases.chests.major,
      shopChestUltimate: agg.totalShopPurchases.chests.ultimate,
      shopMerits: agg.totalShopPurchases.merits,
      shopRankedEntries: agg.totalShopPurchases.rankedEntries,
      shopRarityDraws: agg.totalShopPurchases.rarityDraws,
      shopScrolls: agg.totalShopPurchases.scrolls,
      shopPotions: agg.totalShopPurchases.potions,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tournaments (SPL API — requires token)
// ---------------------------------------------------------------------------

const LEAGUE_NAMES_BY_RATING: Record<number, string> = {
  0: "Novice",
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Diamond",
  5: "Champion",
};

async function buildTournaments(
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
        if (t.status !== 2) return; // not completed
        if (!t.rounds?.length) return;

        const lastRound = t.rounds[t.rounds.length - 1];
        if (lastRound.status !== 2) return; // last round not completed

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
            // ignore
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

// ---------------------------------------------------------------------------
// Card image helpers for markdown
// ---------------------------------------------------------------------------

function cardImageMd(name: string, edition: number, foilSuffix: string): string {
  const imageUrl = getCardImageByLevel(name, edition, foilSuffix);
  return `![](${PROXY150}${imageUrl})`;
}

const FOIL_SUFFIX: Record<string, string> = {
  regular: "",
  gold: "_gold",
  "gold arcane": "_gold",
  black: "_blk",
  "black arcane": "_blk",
};

/** Build a 5-cards-per-row grid of images with count labels. */
function cardGrid(cards: HiveBlogMarketCard[]): string {
  if (cards.length === 0) return "*None*";

  // Flatten into one entry per (card, foil) combination
  const entries: Array<{ name: string; edition: number; foilSuffix: string; count: number }> = [];
  for (const c of cards) {
    for (const [foil, count] of Object.entries(c.foilCounts)) {
      if (count && count > 0)
        entries.push({
          name: c.name,
          edition: c.edition,
          foilSuffix: FOIL_SUFFIX[foil] ?? "",
          count,
        });
    }
  }

  if (entries.length === 0) return "*None*";

  const COLS = 5;
  const rows: string[] = [];
  const header = Array.from({ length: Math.min(COLS, entries.length) }, () => " ").join("|");
  const separator = Array.from({ length: Math.min(COLS, entries.length) }, () => "-").join("|");
  rows.push(`|${header}|`, `|${separator}|`);

  for (let i = 0; i < entries.length; i += COLS) {
    const chunk = entries.slice(i, i + COLS);
    const cells = chunk.map(
      (e) => ` ${cardImageMd(e.name, e.edition, e.foilSuffix)} <br> ${e.count}x `
    );
    while (cells.length < COLS) cells.push(" ");
    rows.push(`|${cells.join("|")}|`);
  }

  return rows.join("\n");
}

// ---------------------------------------------------------------------------
// Markdown builder
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Introduction section
// ---------------------------------------------------------------------------

function buildIntroLines(seasonId: number): string[] {
  return [
    `![](${splinterlands_statistics_icon_url})`,
    "",
    `${SUB_HEADER} 📖 Introduction ${CLOSE_HEADER}`,
    "",
    `Here is my Season ${seasonId} report covering battle performance, earnings, rewards, tournaments and market activity.`,
    "",
    "Feel free to leave a comment, upvote, or share if you find this useful!",
    "",
  ];
}

// ---------------------------------------------------------------------------
// Battle Results section
// ---------------------------------------------------------------------------

function buildBattleSectionLines(acc: HiveBlogAccountData): string[] {
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} ⚔️ Battle Results — @${acc.username}${CLOSE_HEADER}`, "");

  if (acc.leaderboard.length > 0) {
    lines.push(
      "| Format | League | Battles | Wins | Win% | Rating | Rank |",
      "|--------|--------|--------:|-----:|-----:|-------:|-----:|",
      ...acc.leaderboard.map((r) => {
        const leagueCell =
          r.leagueNum != null ? `${leagueIconMd(r.format, r.leagueNum)} ${r.league}` : r.league;
        return `| ${capitalize(r.format)} | ${leagueCell} | ${r.battles} | ${r.wins} | ${r.winPct}% | ${r.rating} | ${r.rank != null ? `#${r.rank}` : "—"} |`;
      }),
      ""
    );
  } else {
    lines.push("*No battle data found for this season.*", "");
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Tournaments section
// ---------------------------------------------------------------------------

function buildTournamentSectionLines(acc: HiveBlogAccountData): string[] {
  if (acc.tournaments.length === 0) return [];
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} 🏆 Tournaments — @${acc.username}${CLOSE_HEADER}`, "");
  lines.push(
    "| Tournament | League | Place | Players | W/L/D | Fee | Prize |",
    "|-----------|--------|------:|-------:|-------|-----|-------|",
    ...acc.tournaments.map(
      (t) =>
        `| ${t.name} | ${t.league} | ${t.finish != null ? `#${t.finish}` : "—"} | ${t.numPlayers} | ${t.wins}/${t.losses}/${t.draws} | ${t.entryFee} | ${t.prizeQty}${t.prizeType ? ` ${t.prizeType}` : ""} |`
    ),
    ""
  );
  return lines;
}

// ---------------------------------------------------------------------------
// Season Rewards section
// ---------------------------------------------------------------------------

function buildRewardsSectionLines(acc: HiveBlogAccountData): string[] {
  if (!acc.rewards) return [];
  const r = acc.rewards;
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} 🎁 Season Rewards — @${acc.username}${CLOSE_HEADER}`, "");

  // Chests opened
  const hasChests = r.minor + r.major + r.ultimate > 0;
  if (hasChests) {
    const minorImg = `![](${PROXY150}${reward_draw_minor_icon_url})`;
    const majorImg = `![](${PROXY150}${reward_draw_major_icon_url})`;
    const ultimateImg = `![](${PROXY150}${reward_draw_ultimate_icon_url})`;
    lines.push(
      `| ${minorImg} | ${majorImg} | ${ultimateImg} |`,
      "|-|-|-|",
      `| Minor: ${r.minor}x | Major: ${r.major}x | Ultimate: ${r.ultimate}x | `,
      ""
    );
  }

  // Shop Purchases
  const hasShopOthers =
    r.shopPotions.gold + r.shopPotions.legendary + r.shopMerits + r.shopRankedEntries > 0;
  const hasShopScrolls =
    r.shopScrolls.common + r.shopScrolls.rare + r.shopScrolls.epic + r.shopScrolls.legendary > 0;
  lines.push(`${SUB_HEADER}**Shop Purchases**${CLOSE_HEADER}`, "");
  lines.push("*Chests*", "");
  const cells1 = [
    ` ![](${PROXY150}${reward_draw_minor_icon_url}) <br> minor <br> ${r.shopChestMinor}x `,
    ` ![](${PROXY150}${reward_draw_major_icon_url}) <br> major <br> ${r.shopChestMajor}x `,
    ` ![](${PROXY150}${reward_draw_ultimate_icon_url}) <br> ultimate <br> ${r.shopChestUltimate}x `,
  ];
  lines.push(`|${cells1.join("|")}|`, "|-|-|-|", "");

  lines.push("*Rarity Draws*", "");
  const cells2 = [
    ` ![](${PROXY150}${reward_draw_common_icon_url}) <br> common <br> ${r.shopRarityDraws.common}x `,
    ` ![](${PROXY150}${reward_draw_rare_icon_url}) <br> rare <br> ${r.shopRarityDraws.rare}x `,
    ` ![](${PROXY150}${reward_draw_epic_icon_url}) <br> epic <br> ${r.shopRarityDraws.epic}x `,
    ` ![](${PROXY150}${reward_draw_legendary_icon_url}) <br> legendary <br> ${r.shopRarityDraws.legendary}x `,
  ];
  lines.push(`|${cells2.join("|")}|`, "|-|-|-|-|", "");

  if (hasShopScrolls) {
    lines.push("*Scrolls*", "");
    const scrollCells = (["common", "rare", "epic", "legendary"] as const)
      .filter((t) => r.shopScrolls[t] > 0)
      .map((t) => {
        const iconMap: Record<string, string> = {
          common: `${unbind_ca_c_icon_url}`,
          rare: `${unbind_ca_r_icon_url}`,
          epic: `${unbind_ca_e_icon_url}`,
          legendary: `${unbind_ca_l_icon_url}`,
        };
        return ` ![](${PROXY150}${iconMap[t]}) <br> ${t} <br> ${r.shopScrolls[t]}x `;
      });
    lines.push(`|${scrollCells.join("|")}|`, `|${scrollCells.map(() => "-").join("|")}|`, "");
  }
  if (hasShopOthers) {
    lines.push("*Others*", "", "| Item | Count |", "|-|-|");
    if (r.shopPotions.gold > 0)
      lines.push(`| ![](${PROXY20}${gold_icon_url}) Alchemy | ${r.shopPotions.gold}x |`);
    if (r.shopPotions.legendary > 0)
      lines.push(
        `| ![](${PROXY20}${legendary_icon_url}) Legendary | ${r.shopPotions.legendary}x |`
      );
    if (r.shopMerits > 0)
      lines.push(`| ![](${PROXY20}${merits_icon_url}) Merits (from chests) | ${r.shopMerits}x |`);
    if (r.shopRankedEntries > 0)
      lines.push(
        `| ![](${PROXY20}${ranked_entries_icon_url}) Ranked Entries | ${r.shopRankedEntries}x |`
      );
    lines.push("");
  }

  // Potions Used
  const potionsUsedEntries = Object.entries(r.potionsUsed).filter(([, v]) => v > 0);
  if (potionsUsedEntries.length > 0) {
    const potionIconMap: Record<string, string> = {
      gold: `![](${PROXY20}${gold_icon_url})`,
      legendary: `![](${PROXY20}${legendary_icon_url})`,
    };
    lines.push("**Potions Used**", "", "| Item | Count |", "|-|-|");
    for (const [type, count] of potionsUsedEntries) {
      const icon = potionIconMap[type] ?? "";
      const label = type === "gold" ? "Alchemy" : type === "legendary" ? "Legendary" : type;
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    lines.push("");
  }

  // Consumables Earned (potions, scrolls, merits, energy)
  const potionEntries = Object.entries(r.potions).filter(([, v]) => v > 0);
  const scrollEntries = Object.entries(r.scrolls).filter(([, v]) => v > 0);
  const hasConsumables =
    potionEntries.length > 0 || scrollEntries.length > 0 || r.merits > 0 || r.energy > 0;
  if (hasConsumables) {
    lines.push("**Consumables Earned**", "");
    const potionIconMap: Record<string, string> = {
      gold: `![](${PROXY20}${gold_icon_url})`,
      legendary: `![](${PROXY20}${legendary_icon_url})`,
    };
    const scrollIconMap: Record<string, string> = {
      common_scroll: `![](${PROXY20}${unbind_ca_c_icon_url})`,
      rare_scroll: `![](${PROXY20}${unbind_ca_r_icon_url})`,
      epic_scroll: `![](${PROXY20}${unbind_ca_e_icon_url})`,
      legendary_scroll: `![](${PROXY20}${unbind_ca_l_icon_url})`,
    };
    lines.push("| Item | Count |", "|-|-|");
    for (const [type, count] of potionEntries) {
      const icon = potionIconMap[type] ?? `![](${PROXY20}${gold_icon_url})`;
      const label =
        type === "gold"
          ? "Alchemy Potion"
          : type === "legendary"
            ? "Legendary Potion"
            : `${type} Potion`;
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    for (const [type, count] of scrollEntries) {
      const icon = scrollIconMap[type] ?? "";
      const label = type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    if (r.merits > 0)
      lines.push(`| ![](${PROXY20}${merits_icon_url}) Merits | ${fmtNum(r.merits)} |`);
    if (r.energy > 0)
      // No proxy because of the svg format and the fact that energy icon is very small already
      lines.push(`| ![](${energy_icon_url}) Energy | ${fmtNum(r.energy)} |`);
    lines.push("");
  }

  // Packs
  const packEntries = Object.entries(r.packs).filter(([, v]) => v > 0);
  if (packEntries.length > 0) {
    const packIconMapLocal: Record<string, string> = {
      1: `${pack_beta_icon_url}`,
      7: `${pack_chaos_icon_url}`,
      8: `${pack_rift_icon_url}`,
      15: `${pack_foundations_icon_url}`,
    };
    const packNameMap: Record<string, string> = {
      1: "Beta",
      7: "Chaos Legion",
      8: "Riftwatchers",
      15: "Foundations",
    };
    lines.push("**Packs Earned**", "");
    const packCells = packEntries.map(([edition, count]) => {
      const iconUrl = packIconMapLocal[edition] ?? `${pack_chaos_icon_url}`;
      const name = packNameMap[edition] ?? `Edition ${edition}`;
      return ` ![](${PROXY150}${iconUrl}) <br> ${name}: ${count}x `;
    });
    lines.push(`|${packCells.join("|")}|`, `|${packCells.map(() => "-").join("|")}|`, "");
  }

  // Fortune Draw Entries
  const hasEntries = r.frontierEntries > 0 || r.rankedEntries > 0;
  if (hasEntries) {
    lines.push("**Fortune Draw Entries**", "");
    const entryCells: string[] = [];
    if (r.frontierEntries > 0)
      entryCells.push(
        ` ![](${PROXY50}${foundation_entries_icon_url}) Frontier <br> ${r.frontierEntries}x `
      );
    if (r.rankedEntries > 0)
      entryCells.push(
        ` ![](${PROXY50}${ranked_entries_icon_url}) Ranked  <br> ${r.rankedEntries}x `
      );
    lines.push(`|${entryCells.join("|")}|`, `|${entryCells.map(() => "-").join("|")}|`, "");
  }

  // Earned Cards (from chests)
  if (r.earnedCards.length > 0) {
    lines.push("**Chests — Earned Cards**", "");
    const goldCards = r.earnedCards
      .filter((c) => (c.foilCounts["gold"] ?? 0) > 0)
      .map((c) => ({ ...c, foilCounts: { gold: c.foilCounts["gold"] } }));
    const regularCards = r.earnedCards
      .filter((c) => (c.foilCounts["regular"] ?? 0) > 0)
      .map((c) => ({ ...c, foilCounts: { regular: c.foilCounts["regular"] } }));
    if (goldCards.length > 0) {
      lines.push("*Gold Rewards*", "", cardGrid(goldCards), "");
    }
    if (regularCards.length > 0) {
      lines.push("*Regular Rewards*", "", cardGrid(regularCards), "");
    }
  }

  // Earned Skins
  if (r.earnedSkins.length > 0) {
    lines.push("**Chests — Earned Skins**", "");
    const skinCells = r.earnedSkins.map(
      (s) =>
        ` ${s.imageUrl ? `![](${PROXY150}${s.imageUrl})` : "🎨"} <br> ${s.skinName} <br> ${s.cardName} <br> ×${s.quantity} `
    );
    for (let i = 0; i < skinCells.length; i += 4) {
      const row = skinCells.slice(i, i + 4);
      lines.push(`|${row.join("|")}|`, `|${row.map(() => "-").join("|")}|`);
    }
    lines.push("");
  }

  // Earned Music
  if (r.earnedMusic.length > 0) {
    lines.push("**Chests — Earned Music**", "");
    const musicCells = r.earnedMusic.map(
      (m) =>
        ` ${m.imageUrl ? `![](${PROXY150}${m.imageUrl})` : "🎵"} <br> ${m.name} <br> ×${m.quantity} `
    );
    for (let i = 0; i < musicCells.length; i += 4) {
      const row = musicCells.slice(i, i + 4);
      lines.push(`|${row.join("|")}|`, `|${row.map(() => "-").join("|")}|`);
    }
    lines.push("");
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Earnings section
// ---------------------------------------------------------------------------

function buildEarningsSectionLines(acc: HiveBlogAccountData): string[] {
  const lines: string[] = [];
  lines.push(`## 💰 Earnings — @${acc.username}`, "");

  if (acc.earned.length > 0) {
    lines.push(
      "| Earnings | # |",
      "| - | - |",
      ...acc.earned.map((e) => `| ${e.label} | ${e.icon} ${fmtNum(e.amount)} |`),
      ""
    );
  } else {
    lines.push("*No earnings data found for this season.*", "");
  }

  if (acc.costs.length > 0) {
    lines.push(
      "| Costs | # |",
      "| - | - |",
      ...acc.costs.map((e) => `| ${e.label} | ${e.icon} ${fmtNum(e.amount)} |`),
      ""
    );
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Market section
// ---------------------------------------------------------------------------

function buildMarketSectionLines(acc: HiveBlogAccountData): string[] {
  const hasMarket =
    acc.boughtCards.length > 0 ||
    acc.soldCards.length > 0 ||
    acc.boughtItems.length > 0 ||
    acc.soldItems.length > 0;
  if (!hasMarket) return [];

  const lines: string[] = [];
  lines.push(`## 💳 Market — @${acc.username}`, "");

  if (acc.boughtCards.length > 0) {
    lines.push("### Cards Bought", "", cardGrid(acc.boughtCards), "");
  }
  if (acc.soldCards.length > 0) {
    lines.push("### Cards Sold", "", cardGrid(acc.soldCards), "");
  }
  if (acc.boughtItems.length > 0) {
    lines.push("### Items Bought", "", "| Item | Qty |", "|-|-|");
    for (const item of acc.boughtItems) {
      lines.push(`| ${item.detailId} | ${item.quantity} |`);
    }
    lines.push("");
  }
  if (acc.soldItems.length > 0) {
    lines.push("### Items Sold", "", "| Item | Qty |", "|-|-|");
    for (const item of acc.soldItems) {
      lines.push(`| ${item.detailId} | ${item.quantity} |`);
    }
    lines.push("");
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Closing section
// ---------------------------------------------------------------------------

function buildClosingLines(): string[] {
  return [
    `${HEADER} Closing notes ${CLOSE_HEADER}`,
    "",
    "This report is generated with the splinterlands statistics tool from @beaker007  [SPL Stats](http://spl-stats.com/) ([git-repo](https://github.com/gamerbeaker007/spl-stats-next)).",
    "",
    `${SUB_HEADER}🙌 Support the Project ${CLOSE_HEADER}`,
    "",
    "✅ Upvote this post – it really helps!",
    "",
    "👉 [Vote for My SPS Validator Node](https://monstermarket.io/validators?validator=beaker007)",
    "",
    "💬 Drop a comment or idea – weird edge cases welcome.",
    "",
    "*10% of post rewards go to @beaker007*",
    "------",
    `![](${spl_logo_icon_url})`,
  ];
}

// ---------------------------------------------------------------------------
// Markdown builder
// ---------------------------------------------------------------------------

function buildMarkdown(seasonId: number, accounts: HiveBlogAccountData[]): string {
  const accountMentions = accounts.map((a) => `@${a.username}`).join(", ");
  const lines: string[] = [];

  lines.push(
    `${HEADER} Season ${seasonId} Splinterlands Report for ${accountMentions} ${CLOSE_HEADER}`,
    ""
  );

  lines.push(...buildIntroLines(seasonId));

  for (const acc of accounts) {
    lines.push(
      ...buildBattleSectionLines(acc),
      ...buildTournamentSectionLines(acc),
      ...buildRewardsSectionLines(acc),
      ...buildEarningsSectionLines(acc),
      ...buildMarketSectionLines(acc),
      "---",
      ""
    );
  }

  lines.push(...buildClosingLines());

  return lines.join("\n");
}
