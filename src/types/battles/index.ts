import {
  death_element_icon_url,
  dragon_element_icon_url,
  earth_element_icon_url,
  fire_element_icon_url,
  life_element_icon_url,
  neutral_element_icon_url,
  water_element_icon_url,
  card_rarity_common_icon_url,
  card_rarity_rare_icon_url,
  card_rarity_epic_icon_url,
  card_rarity_legendary_icon_url,
  archon_filter_icon_url,
  unit_filter_icon_url,
  edition_alpha_icon_url,
  edition_beta_icon_url,
  edition_promo_icon_url,
  edition_reward_icon_url,
  edition_untamed_icon_url,
  edition_dice_icon_url,
  edition_gladius_icon_url,
  edition_chaos_icon_url,
  edition_rift_icon_url,
  edition_soulbound_icon_url,
  edition_rebellion_icon_url,
  edition_soulbound_rebellion_icon_url,
  edition_conclave_arcana_icon_url,
  edition_foundation_icon_url,
  edition_conclave_extra_icon_url,
  edition_conclave_rewards_icon_url,
  edition_eternal_icon_url,
  edition_escalation_icon_url,
  WEB_URL,
} from "@/lib/staticsIconUrls";

const SPL_NEXT_URL = "https://next.splinterlands.com/";

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export interface BattleFilter {
  account: string;
  formats: string[]; // [] = all; values: "wild" | "modern" | "foundation" | "survival"
  cardTypes: string[]; // [] = all; values: "Monster" | "Summoner"
  matchTypes: string[]; // [] = all; values: "Ranked" | "Brawl" | "Tournament" | "Challenge"
  rarities: number[]; // [] = all; values: 1 | 2 | 3 | 4
  colors: string[]; // [] = all; values: "Red" | "Blue" | "White" | "Black" | "Green" | "Gold" | "Gray"
  editions: number[]; // [] = all; native edition selections
  promoTiers: number[]; // [] = all; era tiers for promo cards (edition=2 AND tier IN promoTiers)
  rewardTiers: number[]; // [] = all; era tiers for reward cards (edition=3 AND tier IN rewardTiers)
  extraTiers: number[]; // [] = all; era tiers for extra cards (edition=17 AND tier IN extraTiers)
  minManaCap: number; // 0 = no limit
  maxManaCap: number; // 0 = no limit
  rulesets: string[]; // [] = all
  groupLevels: boolean; // true = aggregate all levels of same card
  minBattleCount: number; // minimum battles to show a card
  sinceDays: number; // 0 = all time, else last N days
  sortBy: "battles" | "win_percentage" | "wins" | "losses";
  topCount: number; // how many cards to show in grid
  filterOpen: boolean; // drawer open state
}

export const DEFAULT_BATTLE_FILTER: BattleFilter = {
  account: "",
  formats: [],
  cardTypes: [],
  matchTypes: [],
  rarities: [],
  colors: [],
  editions: [],
  promoTiers: [],
  rewardTiers: [],
  extraTiers: [],
  minManaCap: 0,
  maxManaCap: 0,
  rulesets: [],
  groupLevels: true,
  minBattleCount: 1,
  sinceDays: 0,
  sortBy: "battles",
  topCount: 5,
  filterOpen: true,
};

// ---------------------------------------------------------------------------
// Data result types
// ---------------------------------------------------------------------------

export interface BestCardStat {
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number;
  gold: boolean;
  battles: number;
  wins: number;
  losses: number;
  winPercentage: number;
  imageUrl: string;
}

export interface LosingCardStat {
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number;
  gold: boolean;
  battles: number;
  imageUrl: string;
}

export interface RulesetCount {
  ruleset: string;
  count: number;
}

export interface MatchTypeStat {
  matchType: string;
  wins: number;
  losses: number;
  total: number;
  winPct: number;
}

export interface FormatStat {
  format: string;
  wins: number;
  losses: number;
  total: number;
  winPct: number;
}

export interface BattleEntry {
  battleId: string;
  opponent: string;
  createdDate: string; // ISO string
  format: string;
  matchType: string;
  manaCap: number;
  ruleset1: string;
  ruleset2: string;
  ruleset3: string;
  result: string;
}

export interface BattleTeamCard {
  position: number;
  cardDetailId: number;
  cardName: string;
  cardType: string; // "Summoner" | "Monster"
  level: number;
  edition: number;
  gold: boolean;
  imageUrl: string;
}

export interface DetailedBattleEntry extends BattleEntry {
  playerTeam: BattleTeamCard[]; // sorted by position; position 0 = summoner
  opponentTeam: BattleTeamCard[];
}

export interface CardDetailResult {
  stat: BestCardStat;
  rulesets: RulesetCount[];
  matchTypeStats: MatchTypeStat[];
  formatStats: FormatStat[];
  pairedSummoners: BestCardStat[];
  pairedMonsters: BestCardStat[];
  nemesisSummoners: LosingCardStat[];
  nemesisMonsters: LosingCardStat[];
  lastWins: DetailedBattleEntry[];
  lastLosses: DetailedBattleEntry[];
  manaCapData: { bucket: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Filter option constants
// ---------------------------------------------------------------------------

export const BATTLE_FORMATS = ["wild", "modern", "foundation", "survival"] as const;
export const CARD_TYPES = ["Monster", "Summoner"] as const;
export const MATCH_TYPES = ["Ranked", "Brawl", "Tournament", "Challenge"] as const;

export const RARITY_OPTIONS = [
  { value: 1, label: "Common", iconUrl: card_rarity_common_icon_url },
  { value: 2, label: "Rare", iconUrl: card_rarity_rare_icon_url },
  { value: 3, label: "Epic", iconUrl: card_rarity_epic_icon_url },
  { value: 4, label: "Legendary", iconUrl: card_rarity_legendary_icon_url },
] as const;

export const RARITY_LABELS: Record<number, string> = {
  1: "Common",
  2: "Rare",
  3: "Epic",
  4: "Legendary",
};

// Card types — displayed as "Archon" (was Summoner) and "Unit" (was Monster)
export const CARD_TYPE_OPTIONS = [
  { value: "Summoner", label: "Archon", iconUrl: archon_filter_icon_url },
  { value: "Monster", label: "Unit", iconUrl: unit_filter_icon_url },
] as const;

export const FORMAT_OPTIONS = [
  { value: "wild", label: "Wild", iconUrl: `${SPL_NEXT_URL}assets/cards/icon_format_wild_off.svg` },
  {
    value: "modern",
    label: "Modern",
    iconUrl: `${SPL_NEXT_URL}assets/cards/icon_format_modern_off.svg`,
  },
  {
    value: "foundation",
    label: "Foundation",
    iconUrl: `${WEB_URL}website/nav/img_nav_items.png`,
  },
  {
    value: "survival",
    label: "Survival",
    iconUrl: `${WEB_URL}website/nav/img_nav_play.png`,
  },
] as const;

export const MATCH_TYPE_OPTIONS = [
  {
    value: "Ranked",
    label: "Ranked",
    iconUrl: `${WEB_URL}website/nav/icon_nav_battle_active@2x.png`,
  },
  {
    value: "Brawl",
    label: "Brawl",
    iconUrl: `${WEB_URL}website/nav/icon_nav_guilds_active@2x.png`,
  },
  {
    value: "Tournament",
    label: "Tournament",
    iconUrl: `${WEB_URL}website/nav/icon_nav_events_active@2x.png`,
  },
  {
    value: "Challenge",
    label: "Challenge",
    iconUrl: `${WEB_URL}website/ui_elements/img_challenge-sword.png`,
  },
] as const;

export interface ColorOption {
  value: string;
  label: string;
  iconUrl: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { value: "Red", label: "Fire", iconUrl: fire_element_icon_url },
  { value: "Blue", label: "Water", iconUrl: water_element_icon_url },
  { value: "White", label: "Life", iconUrl: life_element_icon_url },
  { value: "Black", label: "Death", iconUrl: death_element_icon_url },
  { value: "Green", label: "Earth", iconUrl: earth_element_icon_url },
  { value: "Gold", label: "Dragon", iconUrl: dragon_element_icon_url },
  { value: "Gray", label: "Neutral", iconUrl: neutral_element_icon_url },
];

export interface EditionOption {
  value: number;
  label: string;
  iconUrl: string;
}

export const EDITION_OPTIONS: EditionOption[] = [
  { value: 0, label: "Alpha", iconUrl: edition_alpha_icon_url },
  { value: 1, label: "Beta", iconUrl: edition_beta_icon_url },
  { value: 2, label: "Promo", iconUrl: edition_promo_icon_url },
  { value: 3, label: "Reward", iconUrl: edition_reward_icon_url },
  { value: 4, label: "Untamed", iconUrl: edition_untamed_icon_url },
  { value: 5, label: "Dice", iconUrl: edition_dice_icon_url },
  { value: 6, label: "Gladius", iconUrl: edition_gladius_icon_url },
  { value: 7, label: "Chaos Legion", iconUrl: edition_chaos_icon_url },
  { value: 8, label: "Rift Watchers", iconUrl: edition_rift_icon_url },
  { value: 10, label: "Soulbound", iconUrl: edition_soulbound_icon_url },
  { value: 12, label: "Rebellion", iconUrl: edition_rebellion_icon_url },
  { value: 13, label: "Soulbound Reb.", iconUrl: edition_soulbound_rebellion_icon_url },
  { value: 14, label: "Conclave Arcana", iconUrl: edition_conclave_arcana_icon_url },
  { value: 15, label: "Foundation", iconUrl: edition_foundation_icon_url },
  { value: 16, label: "Soulbound Foundation", iconUrl: edition_foundation_icon_url },
  { value: 17, label: "Conclave Extras", iconUrl: edition_conclave_extra_icon_url },
  { value: 18, label: "Conclave Rewards", iconUrl: edition_conclave_rewards_icon_url },
  { value: 19, label: "Eternal", iconUrl: edition_eternal_icon_url },
  { value: 20, label: "Escalation", iconUrl: edition_escalation_icon_url },
];

// ---------------------------------------------------------------------------
// Edition set groupings (for grouped edition filter UI)
// ---------------------------------------------------------------------------

export interface EditionSetGroup {
  setName: string;
  label: string;
  iconUrl: string;
  /** Edition IDs (from EDITION_OPTIONS) that belong to this set */
  editions: number[];
  /** Era tier to include matching promo (edition=2), reward (edition=3), and extra (edition=17) cards.
   *  null = no cross-set cards for this group (eternal). */
  tier: number | null;
  /** Whether this set has era-promo cards (edition=2 with its eraTier) */
  hasPromo: boolean;
  /** Whether this set has era-reward cards (edition=3 with its eraTier) */
  hasReward: boolean;
  /** Whether this set has extra cards (edition=17 with its eraTier) */
  hasExtra: boolean;
}

export const EDITION_SET_GROUPS: EditionSetGroup[] = [
  {
    setName: "alpha",
    label: "Alpha",
    iconUrl: edition_alpha_icon_url,
    editions: [0],
    tier: 0,
    hasPromo: true,
    hasReward: false,
    hasExtra: false,
  },
  {
    setName: "beta",
    label: "Beta",
    iconUrl: edition_beta_icon_url,
    editions: [1],
    tier: 1,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "untamed",
    label: "Untamed",
    iconUrl: edition_untamed_icon_url,
    editions: [4, 5],
    tier: 4,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "chaos",
    label: "Chaos",
    iconUrl: edition_chaos_icon_url,
    editions: [7, 8, 10],
    tier: 7,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "rebellion",
    label: "Rebellion",
    iconUrl: edition_rebellion_icon_url,
    editions: [12, 13],
    tier: 12,
    hasPromo: true,
    hasReward: true,
    hasExtra: false,
  },
  {
    setName: "conclave",
    label: "Conclave",
    iconUrl: edition_conclave_arcana_icon_url,
    editions: [14, 18, 20],
    tier: 14,
    hasPromo: true,
    hasReward: true,
    hasExtra: true,
  },
  {
    setName: "foundation",
    label: "Foundation",
    iconUrl: edition_foundation_icon_url,
    editions: [15, 16],
    tier: 15,
    hasPromo: false,
    hasReward: false,
    hasExtra: true,
  },
  {
    setName: "eternal",
    label: "Eternal",
    iconUrl: edition_eternal_icon_url,
    editions: [6, 19],
    tier: null,
    hasPromo: false,
    hasReward: false,
    hasExtra: false,
  },
];

export const SORT_OPTIONS = [
  { value: "battles" as const, label: "Battles" },
  { value: "win_percentage" as const, label: "Win %" },
  { value: "wins" as const, label: "Wins" },
  { value: "losses" as const, label: "Losses" },
];

export const TOP_COUNT_OPTIONS = [3, 5, 10, 20];

export const SINCE_OPTIONS = [
  { value: 0, label: "All time" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 3 months" },
  { value: 365, label: "Last year" },
];
