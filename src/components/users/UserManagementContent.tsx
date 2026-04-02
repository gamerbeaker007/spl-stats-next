"use client";

import { useMonitoredAccounts } from "@/hooks/useMonitoredAccounts";
import { Add as AddIcon, Delete as DeleteIcon, Key as KeyIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

interface MonitoredAccount {
  id: string;
  username: string;
  createdAt: Date;
  splAccountId: string;
  tokenStatus: "valid" | "invalid" | "unknown";
  syncStatus: "pending" | "processing" | "failed" | "completed";
}

interface UserManagementContentProps {
  mainUsername: string;
  initialAccounts: MonitoredAccount[];
}

const TOKEN_STATUS_CHIP: Record<
  "valid" | "invalid" | "unknown",
  { label: string; color: "success" | "error" | "default" }
> = {
  valid: { label: "valid", color: "success" },
  invalid: { label: "invalid", color: "error" },
  unknown: { label: "unknown", color: "default" },
};

const SYNC_STATUS_CHIP: Record<
  "pending" | "processing" | "failed" | "completed",
  { label: string; color: "default" | "info" | "error" | "success" }
> = {
  pending: { label: "pending", color: "default" },
  processing: { label: "syncing", color: "info" },
  failed: { label: "sync error", color: "error" },
  completed: { label: "synced", color: "success" },
};

export default function UserManagementContent({
  mainUsername,
  initialAccounts,
}: Readonly<UserManagementContentProps>) {
  const {
    accounts,
    adding,
    busyIds,
    error,
    info,
    clearMessages,
    addAccount,
    removeAccount,
    reAuthAccount,
  } = useMonitoredAccounts(initialAccounts);

  // Dialog UI state (stays in component — pure UI)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [confirmRemoveAccount, setConfirmRemoveAccount] = useState<MonitoredAccount | null>(null);

  const openAddDialog = () => {
    clearMessages();
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    if (adding) return;
    setAddDialogOpen(false);
    setNewUsername("");
    clearMessages();
  };

  const handleAdd = async () => {
    if (!newUsername.trim()) return;
    const success = await addAccount(newUsername);
    if (success) {
      setAddDialogOpen(false);
      setNewUsername("");
    }
  };

  const handleRemove = async (accountId: string) => {
    setConfirmRemoveAccount(null);
    await removeAccount(accountId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5">Monitored Accounts</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add Account
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Main Account: {mainUsername}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your login account. Add it to the monitored list below to collect your own portfolio
              data.
            </Typography>
          </CardContent>
        </Card>

        {accounts.length > 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monitored Accounts ({accounts.length})
              </Typography>
              <List>
                {accounts.map((account) => {
                  const isMain = account.username === mainUsername;
                  const isBusy = busyIds.includes(account.id);
                  const statusChip = TOKEN_STATUS_CHIP[account.tokenStatus];
                  const syncChip = SYNC_STATUS_CHIP[account.syncStatus];
                  const showReAuth = account.tokenStatus === "invalid" && !isBusy;

                  return (
                    <ListItem
                      key={account.id}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {isBusy ? (
                            <CircularProgress size={20} />
                          ) : (
                            <>
                              {showReAuth && (
                                <Tooltip title="Re-authenticate via Keychain">
                                  <IconButton
                                    size="small"
                                    aria-label="re-authenticate"
                                    onClick={() => reAuthAccount(account.id, account.username)}
                                    color="warning"
                                  >
                                    <KeyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Tooltip
                                title={
                                  isMain
                                    ? "Remove your own account from monitoring (you stay logged in)"
                                    : "Remove account"
                                }
                              >
                                <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => setConfirmRemoveAccount(account)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {account.username}
                            {isMain && (
                              <Chip label="you" size="small" color="primary" variant="outlined" />
                            )}
                            <Chip
                              label={statusChip.label}
                              size="small"
                              color={statusChip.color}
                              variant="outlined"
                            />
                            <Chip
                              label={syncChip.label}
                              size="small"
                              color={syncChip.color}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={`Added: ${new Date(account.createdAt).toLocaleDateString("en-GB")}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            No monitored accounts yet. Click &quot;Add Account&quot; to start monitoring.
          </Alert>
        )}
      </Stack>

      {/* ── Add Account Dialog ─────────────────────────────────── */}
      <Dialog open={addDialogOpen} onClose={closeAddDialog} maxWidth="sm" fullWidth>
        <Box sx={{ pt: 3, px: 3 }}>
          <Typography variant="h6" textAlign="center">
            Add Monitored Account
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter the Hive username to monitor and sign with Keychain
          </Typography>
        </Box>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Hive Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
              disabled={adding}
              fullWidth
              autoFocus
              placeholder="e.g. beaker007"
              slotProps={{ htmlInput: { style: { textTransform: "lowercase" } } }}
            />

            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
            {info && (
              <Alert severity="info" variant="outlined">
                {info}
              </Alert>
            )}

            {adding && (
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Waiting for Keychain…
                </Typography>
              </Stack>
            )}

            <Button
              onClick={handleAdd}
              variant="contained"
              size="large"
              disabled={adding || !newUsername.trim()}
              fullWidth
            >
              {adding ? "Signing…" : "Add via Keychain"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Remove Dialog ──────────────────────────────── */}
      <Dialog open={Boolean(confirmRemoveAccount)} onClose={() => setConfirmRemoveAccount(null)}>
        <DialogTitle>Remove Monitored Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmRemoveAccount?.username === mainUsername ? (
              <>
                Remove <strong>{confirmRemoveAccount.username}</strong> (your own account) from
                monitoring? You will remain logged in, but portfolio data collection for this
                account will stop.
              </>
            ) : (
              <>
                Remove <strong>{confirmRemoveAccount?.username}</strong> from monitored accounts?
                Portfolio data collection for this account will stop.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemoveAccount(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => confirmRemoveAccount && handleRemove(confirmRemoveAccount.id)}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
