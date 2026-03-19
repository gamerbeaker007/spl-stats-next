"use client";

import {
  addMonitoredAccountWithKeychain,
  removeMonitoredAccount,
} from "@/lib/backend/actions/auth-actions";
import { usePageTitle } from "@/lib/frontend/context/PageTitleContext";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
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
}

interface UserManagementContentProps {
  mainUsername: string;
  initialAccounts: MonitoredAccount[];
}

export default function UserManagementContent({
  mainUsername,
  initialAccounts,
}: UserManagementContentProps) {
  usePageTitle("User Management");

  const [accounts, setAccounts] = useState<MonitoredAccount[]>(initialAccounts);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [adding, setAdding] = useState(false);

  // Remove confirm dialog state
  const [confirmRemoveAccount, setConfirmRemoveAccount] = useState<MonitoredAccount | null>(null);

  const resetAddDialog = () => {
    setAddDialogOpen(false);
    setNewUsername("");
    setAdding(false);
    setError(null);
  };

  const handleAdd = async () => {
    const lc = newUsername.trim();
    if (!lc) {
      setError("Please enter a username");
      return;
    }
    setError(null);
    setInfo(null);
    setAdding(true);

    try {
      interface HiveKeychainWindow extends Window {
        hive_keychain?: unknown;
      }
      const win = window as HiveKeychainWindow;
      if (!win?.hive_keychain) throw new Error("Hive Keychain extension not found");

      const { KeychainSDK, KeychainKeyTypes } = await import("keychain-sdk");
      const keychain = new KeychainSDK(win);
      const timestamp = Date.now();

      const result = await keychain.signBuffer({
        username: lc,
        message: `${lc}${timestamp}`,
        method: KeychainKeyTypes.posting,
      });

      if (!result?.success) throw new Error("Keychain signature was rejected or failed");

      const signature = typeof result.result === "string" ? result.result : (result.message ?? "");
      if (!signature) throw new Error("Keychain returned empty signature");

      const response = await addMonitoredAccountWithKeychain(lc, timestamp, signature);
      if (!response.success) {
        if ("alreadyMonitoring" in response && response.alreadyMonitoring) {
          setInfo(`'${lc}' is already in your monitored list.`);
        } else {
          setError(response.error ?? "Failed to add account");
        }
        return;
      }

      setAccounts((prev) => [
        ...prev,
        { id: response.accountId!, username: lc, createdAt: new Date() },
      ]);
      resetAddDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    setConfirmRemoveAccount(null);
    try {
      const response = await removeMonitoredAccount(accountId);
      if (response.success) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      } else {
        setError(response.error ?? "Failed to remove account");
      }
    } catch {
      setError("Failed to remove account");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5">Monitored Accounts</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setError(null);
              setInfo(null);
              setAddDialogOpen(true);
            }}
          >
            Add Account
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" onClose={() => setInfo(null)}>
            {info}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Main Account: {mainUsername}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your login account. It is automatically added to the monitored list below so your own
              portfolio data is collected.
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
                  return (
                    <ListItem
                      key={account.id}
                      secondaryAction={
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
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {account.username}
                            {isMain && (
                              <Chip label="you" size="small" color="primary" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={`Added: ${new Date(account.createdAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            No monitored accounts. Sign in to automatically add your own account, or click &quot;Add
            Account&quot; to add others.
          </Alert>
        )}
      </Stack>

      {/* ── Add Account Dialog ─────────────────────────────────── */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !adding && resetAddDialog()}
        maxWidth="sm"
        fullWidth
      >
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
              inputProps={{ style: { textTransform: "lowercase" } }}
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
            onClick={() => confirmRemoveAccount && handleRemoveAccount(confirmRemoveAccount.id)}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
