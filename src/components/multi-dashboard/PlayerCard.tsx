"use client";

import { LandHarvestStatus } from "@/components/multi-dashboard/LandHarvestStatus";
import GuildInfo from "@/components/multi-dashboard/PlayerBrawl";
import { useDailyProgress } from "@/hooks/multi-account-dashboard/useDailyProgress";
import { useLandHarvest } from "@/hooks/multi-account-dashboard/useLandHarvest";
import { usePlayerCardCollection } from "@/hooks/multi-account-dashboard/usePlayerCardCollection";
import { usePlayerSeasonRewards } from "@/hooks/multi-account-dashboard/usePlayerSeasonRewards";
import { usePlayerStatus } from "@/hooks/multi-account-dashboard/usePlayerStatus";
import { useLatestSeasonId } from "@/hooks/useLatestSeasonId";
import { forceRefreshDashboardAccount } from "@/lib/backend/actions/player-actions";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import Leaderboard from "./Leaderboard";
import PlayerBalances from "./PlayerBalances";
import PlayerDailies from "./PlayerDailies";
import PlayerDraws from "./PlayerDraws";
import PlayerInfo from "./PlayerInfo";
import { PlayerHistoryButtons } from "./reward-history/PlayerHistoryButtons";

interface Props {
  username: string;
}

export const PlayerCard = ({ username }: Props) => {
  const { data: player, loading, error, refetch } = usePlayerStatus(username);
  const {
    data: collectionData,
    loading: collectionLoading,
    error: collectionError,
    refetch: collectionRefetch,
  } = usePlayerCardCollection(username);
  const {
    seasonRewards,
    loading: seasonRewardsLoading,
    error: seasonRewardsError,
    refetch: seasonRewardsRefetch,
  } = usePlayerSeasonRewards(username);
  const {
    data: dailyProgress,
    loading: dailyProgressLoading,
    fetchDailyProgress,
  } = useDailyProgress(username);

  const {
    data: landHarvest,
    loading: landHarvestLoading,
    error: landHarvestError,
    fetchLandHarvest,
  } = useLandHarvest(username);

  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [refreshCoolingDown, setRefreshCoolingDown] = useState(false);
  const lastRefreshAtRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // currentSeasonId is not available without a seasons context;
  // pass undefined so PlayerHistoryButtons handles it gracefully.
  const currentSeasonId = useLatestSeasonId();

  // Initial collection fetch on mount
  useEffect(() => {
    collectionRefetch();
  }, [collectionRefetch]);

  // Clear cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  /**
   * True force refresh, scoped to this account: expire this account's cached
   * dashboard reads server-side first, then re-fetch. Other accounts' caches are
   * untouched, so refreshing one card stays cheap on a many-account dashboard.
   *
   * Rate-limited to once per 60 s — the guard lives in the callback so rapid
   * clicks cannot bypass it even if the button is visually re-enabled.
   */
  const handleRefresh = useCallback(async () => {
    if (forceRefreshing) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < 60_000) return;

    setForceRefreshing(true);
    try {
      await forceRefreshDashboardAccount(username);
      await Promise.allSettled([
        refetch(),
        collectionRefetch(),
        seasonRewardsRefetch(),
        fetchDailyProgress(),
        fetchLandHarvest(),
      ]);
      lastRefreshAtRef.current = Date.now();
      setRefreshCoolingDown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setRefreshCoolingDown(false), 60_000);
    } finally {
      setForceRefreshing(false);
    }
  }, [
    forceRefreshing,
    username,
    refetch,
    collectionRefetch,
    seasonRewardsRefetch,
    fetchDailyProgress,
    fetchLandHarvest,
  ]);

  const refreshBusy = forceRefreshing || loading || collectionLoading || refreshCoolingDown;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: username,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
  };

  // Show loading state
  if (loading && !player) {
    return (
      <Box
        ref={setNodeRef}
        style={style}
        border="1px solid"
        borderColor="secondary.main"
        borderRadius={2}
        width={450}
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={4}
        sx={{ mb: 2 }}
      >
        <Box textAlign="center">
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading {username}...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error || player?.error) {
    return (
      <Box
        ref={setNodeRef}
        style={style}
        border="1px solid"
        borderColor="error.main"
        borderRadius={2}
        width={450}
        p={2}
        sx={{ mb: 2 }}
      >
        <Alert severity="error">{error || player?.error}</Alert>
      </Box>
    );
  }

  // No data state
  if (!player) {
    return null;
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      border="1px solid"
      borderColor={isDragging ? "primary.main" : "secondary.main"}
      borderRadius={2}
      width={450}
      display="flex"
      flexDirection="row"
      flexWrap="wrap"
      gap={2}
      p={2}
      sx={{
        mb: 2,
        position: "relative",
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? "action.hover" : "transparent",
        transition: "all 0.2s ease",
        "&:hover .drag-handle": {
          opacity: 1,
        },
      }}
    >
      {/* Drag Handle */}
      <IconButton
        className="drag-handle"
        {...listeners}
        {...attributes}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          opacity: 0.3,
          transition: "opacity 0.2s ease",
          cursor: "grab",
          "&:active": {
            cursor: "grabbing",
          },
          zIndex: 10,
        }}
        size="small"
      >
        <DragHandleIcon fontSize="small" />
      </IconButton>

      {/* Per-card Refresh Button */}
      <Tooltip
        title={
          refreshCoolingDown
            ? "Refresh unavailable — please wait 60 s between refreshes"
            : "Force refresh this account"
        }
        placement="left"
      >
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 40,
            zIndex: 10,
            display: "inline-flex",
          }}
        >
          <IconButton
            onClick={handleRefresh}
            disabled={refreshBusy || refreshCoolingDown}
            sx={{
              opacity: refreshBusy ? 1 : 0.3,
              transition: "opacity 0.2s ease",
              zIndex: 10,
              "&:hover": { opacity: 1 },
            }}
            size="small"
          >
            <RefreshIcon
              fontSize="small"
              sx={
                forceRefreshing
                  ? {
                      animation: "spin 1s linear infinite",
                      "@keyframes spin": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(360deg)" },
                      },
                    }
                  : {}
              }
            />
          </IconButton>
        </span>
      </Tooltip>

      <PlayerInfo username={player.username} playerDetails={player.playerDetails} />

      {/* History Button - Shows only when authorized */}
      <PlayerHistoryButtons
        username={player.username}
        seasonId={currentSeasonId}
        joinDate={player.playerDetails?.join_date}
      />

      <Box>
        {/* Balances Section */}
        <PlayerBalances
          balances={player.balances}
          poolBalances={player.poolBalances}
          seasonRewards={seasonRewards ?? undefined}
          glintLoading={seasonRewardsLoading}
          glintError={seasonRewardsError}
          collectionData={collectionData}
          collectionLoading={collectionLoading}
          collectionError={collectionError}
        />
      </Box>

      <Box width={"100%"}>
        <LandHarvestStatus
          data={landHarvest}
          loading={landHarvestLoading}
          error={landHarvestError}
        />
      </Box>

      <Box width={"100%"}>
        {/* Draws Section */}
        {player.draws && player.balances && (
          <PlayerDraws
            balances={player.balances}
            frontier={player.draws.frontier}
            ranked={player.draws.ranked}
            playerDetails={player.playerDetails}
          />
        )}
      </Box>

      <Box width={"100%"}>
        {/* Daily Progress Section */}
        <GuildInfo
          username={player.username}
          playerDetails={player.playerDetails}
          brawlDetails={player.brawlDetails}
        />
      </Box>

      <Box width={"100%"}>
        {/* Daily Progress Section */}
        <PlayerDailies
          balances={player.balances}
          playerDetails={player.playerDetails}
          dailyProgress={dailyProgress}
          dailyProgressLoading={dailyProgressLoading}
        />
      </Box>
      <Box width={"100%"}>
        {/* Leaderboards Section */}
        {player.playerDetails && <Leaderboard playerDetails={player.playerDetails} />}
      </Box>
      <Typography variant="caption" sx={{ width: "100%", mt: 1 }}>
        Update Date: {player.timestamp ? new Date(player.timestamp).toLocaleString() : "N/A"}
      </Typography>
    </Box>
  );
};
