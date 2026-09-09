"use client";

import { CircularProgress, Stack, Typography } from "@mui/material";

interface LoadMoreSentinelProps {
  /** Callback ref from `useIncrementalViewportList` — observed to load the next batch. */
  sentinelRef: (node: HTMLDivElement | null) => void;
  isLoadingMore: boolean;
  loadingLabel: string;
  /** Shown while idle, e.g. "Showing 60/240. Scroll to load more.". */
  idleLabel: string;
}

/** Bottom-of-list marker that triggers (and reports) incremental loading. */
export function LoadMoreSentinel({
  sentinelRef,
  isLoadingMore,
  loadingLabel,
  idleLabel,
}: Readonly<LoadMoreSentinelProps>) {
  return (
    <Stack ref={sentinelRef} direction="row" spacing={1} alignItems="center" py={1}>
      {isLoadingMore && <CircularProgress size={16} />}
      <Typography variant="caption" color="text.secondary">
        {isLoadingMore ? loadingLabel : idleLabel}
      </Typography>
    </Stack>
  );
}
