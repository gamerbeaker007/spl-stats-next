"use client";

import NeedsReAuthNotice from "@/components/shared/NeedsReAuthNotice";
import type { SectionAuthState } from "@/lib/shared/authenticated-result";
import type { LandHarvestData, LandRegionHarvest } from "@/types/land/landHarvest";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import InfoIcon from "@mui/icons-material/Info";
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const WARN_DAYS = 5;
const CRIT_DAYS = 7;

type StatusColor = "success" | "warning" | "error";

function getStatusColor(ageDays: number): StatusColor {
  if (ageDays < WARN_DAYS) return "success";
  if (ageDays < CRIT_DAYS) return "warning";
  return "error";
}

/** Format an age in milliseconds as a human-readable string. */
function formatAge(ageMs: number): string {
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days >= 1) return `${days.toFixed(1)} d`;
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  return `${hours} hr`;
}

/** Format a small age for the "Data cached" label. */
function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** Returns the age in ms of the oldest valid last_claimed, or null if none. */
function oldestHarvestAgeMs(regions: LandRegionHarvest[], now: number): number | null {
  let oldest: number | null = null;
  for (const region of regions) {
    if (!region.last_claimed) continue;
    const ts = Date.parse(region.last_claimed);
    if (!Number.isFinite(ts)) continue;
    const age = now - ts;
    if (oldest === null || age > oldest) oldest = age;
  }
  return oldest;
}

// ---------------------------------------------------------------------------
// Per-region table row
// ---------------------------------------------------------------------------

function RegionRow({ region, now }: { region: LandRegionHarvest; now: number }) {
  if (!region.last_claimed) {
    return (
      <TableRow>
        <TableCell sx={{ py: 0.5 }}>{region.name}</TableCell>
        <TableCell sx={{ py: 0.5 }} colSpan={2}>
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        </TableCell>
      </TableRow>
    );
  }
  const ts = Date.parse(region.last_claimed);
  if (!Number.isFinite(ts)) {
    return (
      <TableRow>
        <TableCell sx={{ py: 0.5 }}>{region.name}</TableCell>
        <TableCell sx={{ py: 0.5 }} colSpan={2}>
          <Typography variant="caption" color="text.secondary">
            Invalid timestamp
          </Typography>
        </TableCell>
      </TableRow>
    );
  }
  const ageMs = now - ts;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const status = getStatusColor(ageDays);
  return (
    <TableRow>
      <TableCell sx={{ py: 0.5 }}>{region.name}</TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <Chip label={formatAge(ageMs)} color={status} size="small" />
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Details dialog
// ---------------------------------------------------------------------------

interface DialogProps {
  open: boolean;
  onClose: () => void;
  data: LandHarvestData;
  now: number;
}

function LandHarvestDialog({ open, onClose, data, now }: DialogProps) {
  const oldestMs = oldestHarvestAgeMs(data.regions, now);
  const cacheAgeMs = now - Date.parse(data.fetchedAt);

  // Sort regions oldest-first so the most urgent ones appear at the top
  const sortedRegions = [...data.regions].sort((a, b) => {
    const ageA = a.last_claimed ? now - Date.parse(a.last_claimed) : -Infinity;
    const ageB = b.last_claimed ? now - Date.parse(b.last_claimed) : -Infinity;
    return ageB - ageA;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AgricultureIcon fontSize="small" />
        Land Harvest Details
      </DialogTitle>
      <DialogContent>
        {/* Summary */}
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
              Oldest harvest
            </Typography>
            {oldestMs !== null ? (
              <Chip
                label={`${formatAge(oldestMs)} ago`}
                color={getStatusColor(oldestMs / (1000 * 60 * 60 * 24))}
                size="small"
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No harvest data
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
              Data cached
            </Typography>
            <Typography variant="caption">{formatCacheAge(cacheAgeMs)}</Typography>
          </Box>
        </Box>

        {/* Per-region table */}
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Regions
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="caption" fontWeight="bold">
                  Region
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" fontWeight="bold">
                  Status
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRegions.map((region) => (
              <RegionRow key={region.region_number} region={region} now={now} />
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  username: string;
  data: LandHarvestData | null;
  loading: boolean;
  error: string | null;
  /** Set when the account's SPL token needs a re-auth. */
  authState?: SectionAuthState | null;
}

function renderTitle() {
  return (
    <>
      <AgricultureIcon fontSize="small" color="action" />
      <Typography variant="body2" color="text.secondary">
        Land harvested
      </Typography>
    </>
  );
}

export function LandHarvestStatus({ username, data, loading, error, authState }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [dialogOpen, setDialogOpen] = useState(false);

  // Refresh displayed age every minute without re-fetching data
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Loading (no cached data yet)
  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderTitle()}
        <CircularProgress size={14} />
      </Box>
    );
  }

  // Error (and no stale data to fall back on)
  if (error && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderTitle()}
        <Chip label="Error" color="error" size="small" variant="outlined" />
      </Box>
    );
  }

  // Token needs a re-auth — say so instead of silently vanishing.
  if (authState?.needsReAuth && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderTitle()}
        <NeedsReAuthNotice
          username={username}
          label="Land harvest"
          reason={authState.reason}
          jwtExpiresAt={authState.jwtExpiresAt}
        />
      </Box>
    );
  }

  // No data returned by the action
  if (!data) {
    return null;
  }

  const oldestMs = oldestHarvestAgeMs(data.regions, now);

  // Authenticated but player has no regions with a valid last_claimed
  if (oldestMs === null) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderTitle()}
        <Typography variant="body2" color="text.secondary">
          No harvest data
        </Typography>
      </Box>
    );
  }

  const ageDays = oldestMs / (1000 * 60 * 60 * 24);
  const status = getStatusColor(ageDays);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderTitle()}
        <Chip label={formatAge(oldestMs)} color={status} size="small" sx={{ fontWeight: "bold" }} />
        <Tooltip title="View land harvest details">
          <IconButton size="small" onClick={() => setDialogOpen(true)} sx={{ p: 0.25 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {loading && <CircularProgress size={12} />}
      </Box>

      <LandHarvestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        data={data}
        now={now}
      />
    </>
  );
}
