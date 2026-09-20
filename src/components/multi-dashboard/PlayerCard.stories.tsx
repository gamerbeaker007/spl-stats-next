import {
  DASHBOARD_CATEGORY_DEFINITIONS,
  DASHBOARD_CATEGORY_GROUPS,
  getDefaultCategories,
  type MultiAccountDashboardCategories,
} from "@/lib/shared/dashboard-categories";
import type { PlayerCardCollectionData } from "@/types/playerCardCollection";
import type { DailyProgressData } from "@/types/playerDailyProgress";
import type { LandHarvestData } from "@/types/land/landHarvest";
import type { PlayerStatusData } from "@/types/playerStatus";
import type { SplBalance, PlayerPoolBalances } from "@/types/spl/balances";
import type { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import type { SplPlayerDetails } from "@/types/spl/details";
import { Box } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react";
import { PlayerCardContent } from "./PlayerCardContent";

// ---------------------------------------------------------------------------
// Mock data — all sections populated with realistic dummy values
// ---------------------------------------------------------------------------

const MOCK_BALANCES: SplBalance[] = [
  {
    player: "mock-player",
    token: "DEC",
    balance: 125_430,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "DEC-B",
    balance: 8_200,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SPS",
    balance: 54_320,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SPSP",
    balance: 112_000,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SPSP-IN",
    balance: 0,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SPSP-OUT",
    balance: 0,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "CREDITS",
    balance: 2_800,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "ETN",
    balance: 15_000,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "EVP",
    balance: 3_400,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "GOLD",
    balance: 47,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "LEGENDARY",
    balance: 12,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "MIDNIGHTPOT",
    balance: 5,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SCROLL-GOLD",
    balance: 8,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "SCROLL-LEGENDARY",
    balance: 3,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "GUILD-CREDIT",
    balance: 640,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "GLINT",
    balance: 8_900,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date().toISOString(),
  },
  {
    player: "mock-player",
    token: "ECR",
    balance: 8_300_000,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    player: "mock-player",
    token: "FECR",
    balance: 9_100_000,
    last_update_date: "2026-09-20",
    last_reward_block: 0,
    last_reward_time: new Date(Date.now() - 1_800_000).toISOString(),
  },
];

const MOCK_POOL_BALANCES: PlayerPoolBalances = {
  inGameDecQty: 12_000,
  inGameSpsQty: 8_400,
  heDecQty: 5_500,
  heSpsQty: 2_200,
  decQty: 17_500,
  spsQty: 10_600,
};

const MOCK_PLAYER_DETAILS: SplPlayerDetails = {
  name: "mock-player",
  join_date: "2021-03-15T00:00:00.000Z",
  rating: 3_850,
  battles: 2_140,
  wins: 1_380,
  current_streak: 5,
  longest_streak: 18,
  max_rating: 4_210,
  max_rank: 42,
  champion_points: 0,
  guild: {
    id: "mock-guild-1",
    name: "Dragon Warriors",
    brawl_status: 1,
    brawl_level: 3,
    tournament_id: "mock-tournament-id",
    join_date: "2022-01-01T00:00:00.000Z",
    tournament_status: 1,
  },
  avatar_id: 82,
  display_name: "MockPlayer",
  title_pre: "",
  title_post: "",
  collection_power: 485_000,
  modern_rating: 3_420,
  modern_battles: 980,
  modern_wins: 620,
  modern_current_streak: 3,
  modern_longest_streak: 12,
  modern_max_rating: 3_680,
  modern_max_rank: 120,
  modern_league: 4,
  modern_adv_msg_sent: false,
  survival_rating: 0,
  survival_battles: 0,
  survival_wins: 0,
  survival_current_streak: 0,
  survival_longest_streak: 0,
  survival_max_rating: 0,
  survival_max_rank: 0,
  survival_league: 0,
  survival_adv_msg_sent: false,
  foundation_rating: 2_800,
  foundation_battles: 640,
  foundation_wins: 410,
  foundation_current_streak: 2,
  foundation_longest_streak: 9,
  foundation_max_rating: 3_100,
  foundation_max_rank: 210,
  foundation_league: 3,
  foundation_adv_msg_sent: false,
  player_uuid: "mock-uuid-1234",
  season_pass: 1,
  season_details: {
    wild: {
      rank: 63,
      season: 128,
      player: "mock-player",
      rating: 3_850,
      battles: 1_160,
      wins: 750,
      longest_streak: 18,
      max_rating: 4_210,
      league: 5,
      max_league: 5,
      reward_claim_tx: null,
      guild_id: "mock-guild-1",
      guild_name: "Dragon Warriors",
      guild_data: "",
      avatar_id: 82,
      display_name: "MockPlayer",
      title_pre: "",
      title_post: "",
      rshares: 0,
      reward_chest_qty: 25,
      leaderboard: "wild",
    },
    modern: {
      rank: 144,
      season: 128,
      player: "mock-player",
      rating: 3_420,
      battles: 980,
      wins: 620,
      longest_streak: 12,
      max_rating: 3_680,
      league: 4,
      max_league: 4,
      reward_claim_tx: null,
      guild_id: "mock-guild-1",
      guild_name: "Dragon Warriors",
      guild_data: "",
      avatar_id: 82,
      display_name: "MockPlayer",
      title_pre: "",
      title_post: "",
      rshares: 0,
      reward_chest_qty: 18,
      leaderboard: "modern",
    },
    foundation: {
      rank: 238,
      season: 128,
      player: "mock-player",
      rating: 2_800,
      battles: 640,
      wins: 410,
      longest_streak: 9,
      max_rating: 3_100,
      league: 3,
      max_league: 3,
      reward_claim_tx: null,
      guild_id: "mock-guild-1",
      guild_name: "Dragon Warriors",
      guild_data: "",
      avatar_id: 82,
      display_name: "MockPlayer",
      title_pre: "",
      title_post: "",
      rshares: 0,
      reward_chest_qty: 12,
      leaderboard: "foundation",
    },
    survival: null,
  },
};

const MOCK_PLAYER_STATUS: PlayerStatusData = {
  username: "mock-player",
  timestamp: new Date().toISOString(),
  balances: MOCK_BALANCES,
  poolBalances: MOCK_POOL_BALANCES,
  draws: {
    frontier: {
      current_frontier_draw: {
        id: 42,
        end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_entries: 18_420,
        player_entries: 12,
      },
      first_unclaimed_frontier_draw: null,
    },
    ranked: {
      current_ranked_draw: {
        id: 42,
        end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_entries: 32_100,
        player_entries: 8,
        player_has_pass: true,
      },
      first_unclaimed_ranked_draw: null,
      remaining_pass_details: {
        remaining_draws: 6,
        player_pass_count: 1,
      },
    },
  },
  playerDetails: MOCK_PLAYER_DETAILS,
  brawlDetails: {
    id: "BC48-mock-guild-1",
    format: "wild",
    sub_format: "",
    start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 1,
    total_battles: 30,
    completed_battles: 22,
    players: [
      {
        player: "mock-player",
        total_battles: 5,
        entered_battles: 4,
        join_date: "2022-01-01T00:00:00.000Z",
        wins: 3,
        auto_wins: 0,
        losses: 1,
        draws: 0,
        meta_pts: 3.0,
        meta_pts_float: 3.0,
        defeated: 0,
        fray_index: 2,
        brawl_level: 3,
      },
    ],
    frays: [
      {
        cycle: 48,
        tournament_id: "mock-tournament-id",
        guild_id: "mock-guild-1",
        index: 2,
        player: "mock-player",
        brawl_level: 3,
        guild_join_date: "2022-01-01T00:00:00.000Z",
        auto_wins: 0,
        avatar_id: 82,
        rank: 2,
      },
    ],
  },
};

const MOCK_COLLECTION: PlayerCardCollectionData = {
  username: "mock-player",
  date: new Date().toISOString(),
  collectionPower: 485_000,
  playerCollectionValue: {
    player: "mock-player",
    totalListValue: 1_240.5,
    totalMarketValue: 980.25,
    totalBcx: 3_420,
    totalNumberOfCards: 1_842,
    totalSellableCards: 512,
    editionValues: {
      1: {
        marketValue: 120.5,
        listValue: 145.0,
        bcx: 480,
        numberOfCards: 310,
        numberOfSellableCards: 80,
      },
      4: {
        marketValue: 450.0,
        listValue: 580.0,
        bcx: 1_800,
        numberOfCards: 920,
        numberOfSellableCards: 280,
      },
      7: {
        marketValue: 280.0,
        listValue: 340.0,
        bcx: 960,
        numberOfCards: 480,
        numberOfSellableCards: 120,
      },
    },
  },
};

const MOCK_SEASON_REWARDS: SPLSeasonRewards = {
  season_reward_info: {
    season: 128,
    wild_glint: 42_800,
    modern_glint: 18_600,
    survival_glint: null,
    foundation_glint: 11_200,
  },
};

const MOCK_DAILY_PROGRESS: DailyProgressData = {
  username: "mock-player",
  timestamp: new Date().toISOString(),
  format: {
    wild: {
      total_wins: 7,
      total_wins_to_next: 3,
      wins_to_next: 3,
      rewards_earned: 2,
      rewards_ready_to_claim: 0,
      end_date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      current_rewards: { max_ranked_entries: 15 },
    },
    modern: {
      total_wins: 4,
      total_wins_to_next: 6,
      wins_to_next: 6,
      rewards_earned: 1,
      rewards_ready_to_claim: 0,
      end_date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      current_rewards: { max_ranked_entries: 10 },
    },
  },
};

const MOCK_LAND_HARVEST: LandHarvestData = {
  username: "mock-player",
  fetchedAt: new Date().toISOString(),
  regions: [
    {
      name: "Region Alpha",
      region_number: 1,
      region_uid: "RA1",
      last_claimed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "Region Beta",
      region_number: 2,
      region_uid: "RB2",
      last_claimed: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// ---------------------------------------------------------------------------
// Storybook configuration
// ---------------------------------------------------------------------------

/** Args type: flat category toggles so Storybook Controls shows one checkbox per category */
type StoryArgs = MultiAccountDashboardCategories;

function buildArgTypes() {
  const argTypes: Record<string, object> = {};
  for (const group of DASHBOARD_CATEGORY_GROUPS) {
    const defs = Object.values(DASHBOARD_CATEGORY_DEFINITIONS).filter((d) => d.group === group);
    for (const def of defs) {
      argTypes[def.id] = {
        control: "boolean",
        name: def.label,
        table: { category: def.group },
      };
    }
  }
  return argTypes;
}

const meta: Meta<StoryArgs> = {
  title: "MultiDashboard/PlayerCard",
  argTypes: buildArgTypes(),
  args: getDefaultCategories(),
};

export default meta;
type Story = StoryObj<StoryArgs>;

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export const ConfigurablePlayerCard: Story = {
  name: "Configurable Player Card",
  render: (args) => {
    const categories: MultiAccountDashboardCategories = Object.fromEntries(
      Object.keys(getDefaultCategories()).map((id) => [
        id,
        (args as Record<string, boolean>)[id] ?? true,
      ])
    ) as MultiAccountDashboardCategories;

    return (
      <Box
        border="1px solid"
        sx={{ borderColor: "secondary.main" }}
        borderRadius={2}
        width={450}
        p={2}
      >
        <PlayerCardContent
          username="mock-player"
          categories={categories}
          loadAll={false}
          loadingAll={false}
          onLoadAll={() => {}}
          currentSeasonId={128}
          player={MOCK_PLAYER_STATUS}
          collectionData={MOCK_COLLECTION}
          collectionLoading={false}
          collectionError={null}
          seasonRewards={MOCK_SEASON_REWARDS}
          seasonRewardsLoading={false}
          seasonRewardsError={null}
          dailyProgress={MOCK_DAILY_PROGRESS}
          dailyProgressLoading={false}
          dailyProgressError={null}
          dailyProgressAuthState={null}
          landHarvest={MOCK_LAND_HARVEST}
          landHarvestLoading={false}
          landHarvestError={null}
          landHarvestAuthState={null}
          onReAuthenticated={async () => {}}
        />
      </Box>
    );
  },
};

/** Same card but with a minimalist config — only rating and main balance enabled */
export const MinimalConfig: Story = {
  name: "Minimal Config (Rating + Main Balance)",
  args: Object.fromEntries(
    Object.keys(getDefaultCategories()).map((id) => [id, id === "rating" || id === "balanceMain"])
  ) as StoryArgs,
  render: ConfigurablePlayerCard.render,
};

/** Shows the card immediately after Load All is clicked (all sections visible) */
export const LoadAllState: Story = {
  name: "Load All Active",
  render: (args) => {
    const categories: MultiAccountDashboardCategories = Object.fromEntries(
      Object.keys(getDefaultCategories()).map((id) => [
        id,
        (args as Record<string, boolean>)[id] ?? true,
      ])
    ) as MultiAccountDashboardCategories;

    return (
      <Box
        border="1px solid"
        sx={{ borderColor: "secondary.main" }}
        borderRadius={2}
        width={450}
        p={2}
      >
        <PlayerCardContent
          username="mock-player"
          categories={categories}
          loadAll={true}
          loadingAll={false}
          onLoadAll={() => {}}
          currentSeasonId={128}
          player={MOCK_PLAYER_STATUS}
          collectionData={MOCK_COLLECTION}
          collectionLoading={false}
          collectionError={null}
          seasonRewards={MOCK_SEASON_REWARDS}
          seasonRewardsLoading={false}
          seasonRewardsError={null}
          dailyProgress={MOCK_DAILY_PROGRESS}
          dailyProgressLoading={false}
          dailyProgressError={null}
          dailyProgressAuthState={null}
          landHarvest={MOCK_LAND_HARVEST}
          landHarvestLoading={false}
          landHarvestError={null}
          landHarvestAuthState={null}
          onReAuthenticated={async () => {}}
        />
      </Box>
    );
  },
};
