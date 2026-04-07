import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getSplMaintenanceStatus } from "@/lib/backend/actions/spl-status";
import { getSyncStatesForUsernames } from "@/lib/backend/db/account-sync-states";
import { AccountSyncState } from "@prisma/client";
import { Alert, Box } from "@mui/material";
import UserManagementContent from "./UserManagementContent";

type SyncStatus = "pending" | "processing" | "failed" | "completed";

function aggregateSyncStatus(states: AccountSyncState[]): SyncStatus {
  if (states.length === 0) return "pending";
  if (states.some((s) => s.status === "failed")) return "failed";
  if (states.some((s) => s.status === "processing")) return "processing";
  if (states.every((s) => s.status === "completed")) return "completed";
  return "pending";
}

export default async function UserManagementServer() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please login to manage monitored accounts</Alert>
      </Box>
    );
  }

  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);
  const [syncStates, { maintenance: splInMaintenance }] = await Promise.all([
    getSyncStatesForUsernames(usernames),
    getSplMaintenanceStatus(),
  ]);

  const syncByUsername = new Map<string, AccountSyncState[]>();
  for (const state of syncStates) {
    const list = syncByUsername.get(state.username) ?? [];
    list.push(state);
    syncByUsername.set(state.username, list);
  }

  return (
    <UserManagementContent
      mainUsername={user.username}
      splInMaintenance={splInMaintenance}
      initialAccounts={accounts.map((acc) => ({
        id: acc.id,
        username: acc.username,
        createdAt: acc.createdAt,
        splAccountId: acc.splAccount.id,
        tokenStatus: acc.splAccount.tokenStatus as "valid" | "invalid" | "unknown",
        syncStatus: aggregateSyncStatus(syncByUsername.get(acc.username) ?? []),
      }))}
    />
  );
}
