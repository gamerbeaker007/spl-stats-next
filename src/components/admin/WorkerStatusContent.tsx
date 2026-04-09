import { getAllSyncStates } from "@/lib/backend/db/account-sync-states";
import { getValidMonitoredAccountUsernames } from "@/lib/backend/db/monitored-accounts";
import { getLatestSeason } from "@/lib/backend/db/seasons";
import { getLatestWorkerRun } from "@/lib/backend/db/worker-runs";
import { AccountSyncState } from "@prisma/client";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

type SyncStatus = "pending" | "processing" | "failed" | "completed";

const SYNC_STATUS_COLOR: Record<SyncStatus, "default" | "info" | "error" | "success"> = {
  pending: "default",
  processing: "info",
  failed: "error",
  completed: "success",
};

const WORKER_STATUS_COLOR: Record<string, "default" | "info" | "error" | "success"> = {
  running: "info",
  completed: "success",
  failed: "error",
};

const STATUS_ORDER: Record<SyncStatus, number> = {
  failed: 0,
  processing: 1,
  pending: 2,
  completed: 3,
};

function aggregateSyncStatus(states: AccountSyncState[]): SyncStatus {
  if (states.length === 0) return "pending";
  if (states.some((s) => s.status === "failed")) return "failed";
  if (states.some((s) => s.status === "processing")) return "processing";
  if (states.every((s) => s.status === "completed")) return "completed";
  return "pending";
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

export default async function WorkerStatusContent() {
  const [latestRun, allStates, latestSeason, validUsernames] = await Promise.all([
    getLatestWorkerRun(),
    getAllSyncStates(),
    getLatestSeason(),
    getValidMonitoredAccountUsernames(),
  ]);

  const currentSeasonId = latestSeason?.id ?? 0;

  // Group sync states by username
  const byUsername = new Map<string, AccountSyncState[]>();
  for (const state of allStates) {
    const list = byUsername.get(state.username) ?? [];
    list.push(state);
    byUsername.set(state.username, list);
  }

  // Add monitored accounts with valid tokens that have no sync state yet
  for (const username of validUsernames) {
    if (!byUsername.has(username)) {
      byUsername.set(username, []);
    }
  }

  const accounts = [...byUsername.entries()]
    .map(([username, states]) => ({
      username,
      syncStatus: aggregateSyncStatus(states),
      completedSyncKeys: states.filter((s) => s.status === "completed").length,
      totalSyncKeys: states.length,
      minSeasonProcessed:
        states.length > 0 ? Math.min(...states.map((s) => s.lastSeasonProcessed)) : 0,
      lastUpdated:
        states.length > 0 ? new Date(Math.max(...states.map((s) => s.updatedAt.getTime()))) : null,
      lastSyncedKey:
        states.length > 0 ? states.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).key : null,
      error: states.find((s) => s.errorMessage)?.errorMessage ?? null,
    }))
    .sort((a, b) => {
      const diff = STATUS_ORDER[a.syncStatus] - STATUS_ORDER[b.syncStatus];
      return diff !== 0 ? diff : a.username.localeCompare(b.username);
    });

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Worker Status</Typography>

        <Card variant="outlined">
          <CardContent>
            {latestRun ? (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  label={latestRun.status}
                  size="small"
                  color={WORKER_STATUS_COLOR[latestRun.status] ?? "default"}
                />
                <Typography variant="body2" color="text.secondary">
                  Started {formatRelativeTime(latestRun.startedAt)}
                </Typography>
                {latestRun.durationMs != null && (
                  <Typography variant="body2" color="text.secondary">
                    Duration: {formatDuration(latestRun.durationMs)}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Accounts: {latestRun.accountsProcessed} / {accounts.length}
                </Typography>
                {latestRun.error && (
                  <Typography variant="body2" color="error.main">
                    {latestRun.error}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No worker runs recorded yet.
              </Typography>
            )}
          </CardContent>
        </Card>

        {accounts.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sync Key</TableCell>
                  <TableCell>Last Synced Key</TableCell>
                  <TableCell>Season</TableCell>
                  <TableCell>Last Sync</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.username} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {acc.username}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          label={acc.syncStatus}
                          size="small"
                          color={SYNC_STATUS_COLOR[acc.syncStatus]}
                          variant="outlined"
                        />
                        {acc.error && (
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{ maxWidth: 200, display: "block" }}
                            noWrap
                          >
                            {acc.error}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          acc.completedSyncKeys === acc.totalSyncKeys && acc.totalSyncKeys > 0
                            ? "text.primary"
                            : "text.secondary"
                        }
                      >
                        {acc.completedSyncKeys}/{acc.totalSyncKeys}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                        color="text.secondary"
                      >
                        {acc.lastSyncedKey ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          acc.minSeasonProcessed >= currentSeasonId && currentSeasonId > 0
                            ? "success.main"
                            : "text.secondary"
                        }
                      >
                        {acc.minSeasonProcessed > 0
                          ? `${acc.minSeasonProcessed} / ${currentSeasonId}`
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {acc.lastUpdated ? formatRelativeTime(acc.lastUpdated) : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No accounts synced yet.</Alert>
        )}
      </Stack>
    </Box>
  );
}
