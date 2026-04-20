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
  ranked_filter_icon_url,
  tournament_filter_icon_url,
  brawl_filter_icon_url,
  challenge_icon_url,
  format_wild_icon_url,
  format_modern_icon_url,
  format_foundation_icon_url,
  format_survival_icon_url,
} from "@/lib/staticsIconUrls";

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
  foil: number;
  battles: number;
  wins: number;
  losses: number;
  winPercentage: number;
  imageUrl: string;
}

export interface NemesisOpponentStat {
  opponent: string;
  battles: number;
}

export interface NemesisData {
  overall: NemesisOpponentStat[];
  byFormat: Record<string, NemesisOpponentStat[]>;
  byMatchType: Record<string, NemesisOpponentStat[]>;
}

export interface LosingCardStat {
  cardDetailId: number;
  cardName: string;
  cardType: string;
  rarity: number;
  color: string;
  edition: number;
  level: number;
  foil: number;
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
  foil: number;
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
  { value: "wild", label: "Wild", iconUrl: format_wild_icon_url },
  {
    value: "modern",
    label: "Modern",
    iconUrl: format_modern_icon_url,
  },
  {
    value: "foundation",
    label: "Foundation",
    iconUrl: format_foundation_icon_url,
  },
  {
    value: "survival",
    label: "Survival",
    iconUrl: format_survival_icon_url,
  },
] as const;

export const MATCH_TYPE_OPTIONS = [
  {
    value: "Ranked",
    label: "Ranked",
    iconUrl: ranked_filter_icon_url,
  },
  {
    value: "Brawl",
    label: "Brawl",
    iconUrl: brawl_filter_icon_url,
  },
  {
    value: "Tournament",
    label: "Tournament",
    iconUrl: tournament_filter_icon_url,
  },
  {
    value: "Challenge",
    label: "Challenge",
    iconUrl: challenge_icon_url,
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
