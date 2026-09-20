"use client";

import { PlayerCardContent } from "@/components/multi-dashboard/PlayerCardContent";
import { useDailyProgress } from "@/hooks/multi-account-dashboard/useDailyProgress";
import { useLandHarvest } from "@/hooks/multi-account-dashboard/useLandHarvest";
import { usePlayerCardCollection } from "@/hooks/multi-account-dashboard/usePlayerCardCollection";
import { usePlayerSeasonRewards } from "@/hooks/multi-account-dashboard/usePlayerSeasonRewards";
import { usePlayerStatus } from "@/hooks/multi-account-dashboard/usePlayerStatus";
import { useLatestSeasonId } from "@/hooks/useLatestSeasonId";
import { forceRefreshDashboardAccount } from "@/lib/backend/actions/player-actions";
import {
  getDefaultCategories,
  resolveRequiredSources,
  type MultiAccountDashboardCategories,
} from "@/lib/shared/dashboard-categories";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  username: string;
  config: MultiAccountDashboardCategories;
}

export const PlayerCard = ({ username, config }: Props) => {
  const [loadAll, setLoadAll] = useState(false);
  const effectiveCategories = loadAll ? getDefaultCategories() : config;
  const sources = resolveRequiredSources(effectiveCategories, loadAll);

  const needsPlayerStatus = sources.has("playerStatus");
  const needsCollection = sources.has("collection");
  const needsSeasonRewards = sources.has("seasonRewards");
  const needsDaily = sources.has("daily");
  const needsLand = sources.has("land");

  const {
    data: player,
    loading,
    error,
    refetch,
  } = usePlayerStatus(username, {
    enabled: needsPlayerStatus,
    includeBrawl: effectiveCategories.brawl,
  });
  const {
    data: collectionData,
    loading: collectionLoading,
    error: collectionError,
    refetch: collectionRefetch,
  } = usePlayerCardCollection(username, { enabled: needsCollection });
  const {
    seasonRewards,
    loading: seasonRewardsLoading,
    error: seasonRewardsError,
    refetch: seasonRewardsRefetch,
  } = usePlayerSeasonRewards(username, { enabled: needsSeasonRewards });
  const {
    data: dailyProgress,
    loading: dailyProgressLoading,
    error: dailyProgressError,
    authState: dailyProgressAuthState,
    fetchDailyProgress,
  } = useDailyProgress(username, { enabled: needsDaily });
  const {
    data: landHarvest,
    loading: landHarvestLoading,
    error: landHarvestError,
    authState: landHarvestAuthState,
    fetchLandHarvest,
  } = useLandHarvest(username, { enabled: needsLand });

  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [refreshCoolingDown, setRefreshCoolingDown] = useState(false);
  const lastRefreshAtRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial collection fetch on mount (collection hook doesn't auto-fetch)
  useEffect(() => {
    if (needsCollection) collectionRefetch();
  }, [needsCollection, collectionRefetch]);

  // Clear cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const loadingAll =
    loadAll &&
    (loading ||
      collectionLoading ||
      seasonRewardsLoading ||
      dailyProgressLoading ||
      landHarvestLoading);

  /**
   * True force refresh, scoped to this account. Rate-limited to once per 60 s.
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

  const handleReAuthenticated = useCallback(async () => {
    await Promise.allSettled([refetch(), fetchDailyProgress(), fetchLandHarvest()]);
  }, [refetch, fetchDailyProgress, fetchLandHarvest]);

  const currentSeasonId = useLatestSeasonId();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: username,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
  };

  const refreshBusy = forceRefreshing || (needsPlayerStatus && loading) || refreshCoolingDown;

  // Show initial loading spinner only when playerStatus is required and hasn't loaded yet
  if (needsPlayerStatus && loading && !player) {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      border="1px solid"
      borderColor={isDragging ? "primary.main" : "secondary.main"}
      borderRadius={2}
      width={450}
      p={2}
      sx={{
        mb: 2,
        position: "relative",
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? "action.hover" : "transparent",
        transition: "all 0.2s ease",
        "&:hover .drag-handle": { opacity: 1 },
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
          "&:active": { cursor: "grabbing" },
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
          style={{ position: "absolute", top: 8, right: 40, zIndex: 10, display: "inline-flex" }}
        >
          <IconButton
            onClick={handleRefresh}
            disabled={refreshBusy}
            sx={{
              opacity: refreshBusy ? 1 : 0.3,
              transition: "opacity 0.2s ease",
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

      <PlayerCardContent
        username={username}
        categories={effectiveCategories}
        loadAll={loadAll}
        loadingAll={loadingAll}
        onLoadAll={() => setLoadAll(true)}
        currentSeasonId={currentSeasonId}
        player={player}
        collectionData={collectionData}
        collectionLoading={collectionLoading}
        collectionError={collectionError}
        seasonRewards={seasonRewards}
        seasonRewardsLoading={seasonRewardsLoading}
        seasonRewardsError={seasonRewardsError}
        dailyProgress={dailyProgress}
        dailyProgressLoading={dailyProgressLoading}
        dailyProgressError={dailyProgressError}
        dailyProgressAuthState={dailyProgressAuthState}
        landHarvest={landHarvest}
        landHarvestLoading={landHarvestLoading}
        landHarvestError={landHarvestError}
        landHarvestAuthState={landHarvestAuthState}
        onReAuthenticated={handleReAuthenticated}
      />
    </Box>
  );
};
