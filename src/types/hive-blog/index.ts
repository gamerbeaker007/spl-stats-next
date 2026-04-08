export interface HiveBlogLeaderboardRow {
  format: string;
  battles: number;
  wins: number;
  winPct: string;
  league: string;
  leagueNum: number | null;
  rating: number;
  rank: number | null;
}

export interface HiveBlogEarningsDetailRow {
  label: string;
  icon: string; // inline markdown image string, e.g. "![dec](...)"
  amount: number;
  isEarned: boolean;
}

export interface HiveBlogTournamentRow {
  name: string;
  league: string;
  numPlayers: number;
  finish: number | null;
  wins: number;
  losses: number;
  draws: number;
  entryFee: string;
  prizeQty: string;
  prizeType: string;
}

export interface HiveBlogRewardSummary {
  /** Chests opened */
  minor: number;
  major: number;
  ultimate: number;
  /** Earned consumables */
  potions: { [type: string]: number };
  potionsUsed: { [type: string]: number };
  merits: number;
  energy: number;
  scrolls: { [type: string]: number };
  /** Packs earned */
  packs: { [edition: number]: number };
  /** Fortune draw entries earned */
  frontierEntries: number;
  rankedEntries: number;
  /** Cards earned from chests (resolved names) */
  earnedCards: HiveBlogMarketCard[];
  /** Skins earned from chests */
  earnedSkins: Array<{ skinName: string; cardName: string; imageUrl: string; quantity: number }>;
  /** Music earned from chests */
  earnedMusic: Array<{ name: string; imageUrl: string; quantity: number }>;
  /** Shop purchases */
  shopChestMinor: number;
  shopChestMajor: number;
  shopChestUltimate: number;
  shopMerits: number;
  shopRankedEntries: number;
  shopRarityDraws: { common: number; rare: number; epic: number; legendary: number };
  shopScrolls: { common: number; rare: number; epic: number; legendary: number };
  shopPotions: { gold: number; legendary: number };
}

export interface HiveBlogMarketCard {
  name: string;
  edition: number;
  /** Count per foil variant (regular, gold, gold arcane, black, black arcane). */
  foilCounts: Partial<Record<import("@/types/card").CardFoil, number>>;
}

export interface HiveBlogMarketItem {
  detailId: string;
  quantity: number;
}

export interface HiveBlogAccountData {
  username: string;
  leaderboard: HiveBlogLeaderboardRow[];
  earned: HiveBlogEarningsDetailRow[];
  costs: HiveBlogEarningsDetailRow[];
  rewards: HiveBlogRewardSummary | null;
  tournaments: HiveBlogTournamentRow[];
  boughtCards: HiveBlogMarketCard[];
  soldCards: HiveBlogMarketCard[];
  boughtItems: HiveBlogMarketItem[];
  soldItems: HiveBlogMarketItem[];
}

export interface HiveBlogPost {
  title: string;
  body: string;
  username: string;
}

export interface HiveBlogResult {
  previousSeasonId: number;
  accounts: HiveBlogAccountData[];
  missingAccounts: string[];
  /** Combined mode: single title + body */
  title: string;
  body: string;
  /** Separate mode: one post per account */
  posts: HiveBlogPost[];
  mode: "combined" | "separate";
}

export const REQUIRED_TAGS = ["splinterlands", "play2earn", "splinterstats"] as const;

export const HIVE_COMMUNITY = "hive-13323";
export const BENEFICIARY_ACCOUNT = "beaker007";
export const BENEFICIARY_WEIGHT = 1000; // 10% (out of 10000)
