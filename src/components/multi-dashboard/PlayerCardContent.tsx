"use client";

import { LandHarvestStatus } from "@/components/multi-dashboard/LandHarvestStatus";
import GuildInfo from "@/components/multi-dashboard/PlayerBrawl";
import NeedsReAuthNotice from "@/components/shared/NeedsReAuthNotice";
import type { SectionAuthState } from "@/lib/shared/authenticated-result";
import type { MultiAccountDashboardCategories } from "@/lib/shared/dashboard-categories";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { DailyProgressData } from "@/types/playerDailyProgress";
import { LandHarvestData } from "@/types/land/landHarvest";
import { PlayerStatusData } from "@/types/playerStatus";
import { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Leaderboard from "./Leaderboard";
import PlayerBalances from "./PlayerBalances";
import PlayerDailies from "./PlayerDailies";
import PlayerDraws from "./PlayerDraws";
import PlayerInfo from "./PlayerInfo";
import { PlayerHistoryButtons } from "./reward-history/PlayerHistoryButtons";

export interface PlayerCardContentProps {
  username: string;
  categories: MultiAccountDashboardCategories;
  loadAll: boolean;
  loadingAll: boolean;
  onLoadAll: () => void;

  player: PlayerStatusData | null;

  collectionData: PlayerCardCollectionData | null;
  collectionLoading: boolean;
  collectionError: string | null;

  seasonRewards: SPLSeasonRewards | null;
  seasonRewardsLoading: boolean;
  seasonRewardsError: string | null;

  dailyProgress: DailyProgressData | null;
  dailyProgressLoading: boolean;
  dailyProgressError: string | null;
  dailyProgressAuthState: SectionAuthState | null;

  landHarvest: LandHarvestData | null;
  landHarvestLoading: boolean;
  landHarvestError: string | null;
  landHarvestAuthState: SectionAuthState | null;

  onReAuthenticated: () => Promise<void>;

  /** Current season ID — provided by the PlayerCard container or as a story prop. */
  currentSeasonId?: number;
}

export function PlayerCardContent({
  username,
  categories,
  loadAll,
  loadingAll,
  onLoadAll,
  player,
  collectionData,
  collectionLoading,
  collectionError,
  seasonRewards,
  seasonRewardsLoading,
  seasonRewardsError,
  dailyProgress,
  dailyProgressLoading,
  dailyProgressError,
  dailyProgressAuthState,
  landHarvest,
  landHarvestLoading,
  landHarvestError,
  landHarvestAuthState,
  onReAuthenticated,
  currentSeasonId,
}: PlayerCardContentProps) {
  const reAuthSections: string[] = [];
  if (dailyProgressAuthState?.needsReAuth && categories.daily)
    reAuthSections.push("Daily Progress");
  if (landHarvestAuthState?.needsReAuth && categories.land) reAuthSections.push("Land harvest");
  if (player?.brawlAuthState?.needsReAuth && categories.brawl)
    reAuthSections.push("Fray selection");

  const reAuthState =
    (categories.daily && dailyProgressAuthState) ||
    (categories.land && landHarvestAuthState) ||
    (categories.brawl && player?.brawlAuthState) ||
    null;

  const anyBalanceEnabled =
    categories.balanceMain ||
    categories.balanceElectronium ||
    categories.balancePotions ||
    categories.balanceScrolls ||
    categories.balanceGuild ||
    categories.balanceGlint ||
    categories.collection;

  const showLoadAllButton = !loadAll;

  return (
    <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2} sx={{ width: "100%" }}>
      {/* Card header — always rendered */}
      <PlayerInfo
        username={username}
        playerDetails={categories.rating ? player?.playerDetails : undefined}
        showRating={categories.rating}
      />

      {reAuthSections.length > 0 && reAuthState && (
        <NeedsReAuthNotice
          username={username}
          label={reAuthSections.join(", ")}
          variant="banner"
          reason={reAuthState.reason}
          jwtExpiresAt={reAuthState.jwtExpiresAt}
          onReAuthenticated={onReAuthenticated}
        />
      )}

      {categories.history && (
        <PlayerHistoryButtons
          username={username}
          seasonId={currentSeasonId}
          joinDate={player?.playerDetails?.join_date}
        />
      )}

      {anyBalanceEnabled && (
        <Box width="100%">
          <PlayerBalances
            categories={categories}
            balances={player?.balances}
            poolBalances={player?.poolBalances}
            seasonRewards={seasonRewards ?? undefined}
            glintLoading={seasonRewardsLoading}
            glintError={seasonRewardsError}
            collectionData={collectionData}
            collectionLoading={collectionLoading}
            collectionError={collectionError}
          />
        </Box>
      )}

      {categories.land && (
        <Box width="100%">
          <LandHarvestStatus
            username={username}
            data={landHarvest}
            loading={landHarvestLoading}
            error={landHarvestError}
            authState={landHarvestAuthState}
          />
        </Box>
      )}

      {categories.draws && player?.draws && player?.balances && (
        <Box width="100%">
          <PlayerDraws
            balances={player.balances}
            frontier={player.draws.frontier}
            ranked={player.draws.ranked}
            playerDetails={player.playerDetails}
          />
        </Box>
      )}

      {categories.brawl && (
        <Box width="100%">
          <GuildInfo
            username={username}
            playerDetails={player?.playerDetails}
            brawlDetails={player?.brawlDetails}
            brawlAuthState={player?.brawlAuthState}
          />
        </Box>
      )}

      {categories.daily && (
        <Box width="100%">
          <PlayerDailies
            username={username}
            balances={player?.balances}
            playerDetails={player?.playerDetails}
            dailyProgress={dailyProgress}
            dailyProgressLoading={dailyProgressLoading}
            dailyProgressError={dailyProgressError}
            dailyProgressAuthState={dailyProgressAuthState}
          />
        </Box>
      )}

      {categories.leaderboard && (
        <Box width="100%">
          <Leaderboard playerDetails={player?.playerDetails} />
        </Box>
      )}

      {player?.timestamp && (
        <Typography variant="caption" sx={{ width: "100%", mt: 1 }}>
          Update Date: {new Date(player.timestamp).toLocaleString()}
        </Typography>
      )}

      {showLoadAllButton && (
        <Box width="100%" display="flex" justifyContent="center">
          <Button
            size="small"
            variant="text"
            color="secondary"
            startIcon={
              loadingAll ? <CircularProgress size={14} /> : <OpenInFullIcon fontSize="small" />
            }
            onClick={onLoadAll}
            disabled={loadingAll}
            sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
          >
            {loadingAll ? "Loading all…" : "Load All"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
