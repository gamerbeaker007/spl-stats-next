"use client";

import { addMonitoredAccount, removeMonitoredAccount } from "@/lib/backend/actions/auth-actions";
import { usePageTitle } from "@/lib/frontend/context/PageTitleContext";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [signingInProgress, setSigningInProgress] = useState(false);

  const handleAddAccount = async () => {
    if (!newUsername.trim()) {
      setError("Please enter a username");
      return;
    }

    setError(null);
    setSigningInProgress(true);

    try {
      // Get signature from keychain
      interface HiveKeychainWindow extends Window {
        hive_keychain?: unknown;
      }
      const win = window as HiveKeychainWindow;
      if (!win || !win.hive_keychain) {
        throw new Error("Keychain extension not found");
      }

      const { KeychainSDK, KeychainKeyTypes } = await import("keychain-sdk");
      const keychain = new KeychainSDK(win);

      const timestamp = Date.now();
      const message = `${newUsername.toLowerCase()}${timestamp}`;

      const result = await keychain.signBuffer({
        username: newUsername.toLowerCase(),
        message,
        method: KeychainKeyTypes.posting,
      });

      if (!result?.success) {
        throw new Error("Keychain signature was rejected or failed");
      }

      const signature = typeof result.result === "string" ? result.result : result.message || "";

      if (!signature) {
        throw new Error("Keychain returned empty signature");
      }

      // Add account via server action
      const response = await addMonitoredAccount(newUsername.toLowerCase(), timestamp, signature);

      if (!response.success) {
        throw new Error(response.error || "Failed to add account");
      }

      // Add to local state
      setAccounts((prev) => [
        ...prev,
        {
          id: response.accountId!,
          username: newUsername.toLowerCase(),
          createdAt: new Date(),
        },
      ]);
      setAddDialogOpen(false);
      setNewUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSigningInProgress(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const response = await removeMonitoredAccount(accountId);
      if (response.success) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      } else {
        setError(response.error || "Failed to remove account");
      }
    } catch {
      setError("Failed to remove account");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5">Monitored Accounts</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Account
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Main Account: {mainUsername}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This is your logged-in account
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
                {accounts.map((account) => (
                  <ListItem
                    key={account.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveAccount(account.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={account.username}
                      secondary={`Added: ${new Date(account.createdAt).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">
            No monitored accounts yet. Click &quot;Add Account&quot; to add one.
          </Alert>
        )}
      </Stack>

      {/* Add Account Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => !signingInProgress && setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ pt: 3, px: 3 }}>
          <Typography variant="h6" textAlign="center">
            Add Monitored Account
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Sign in with Hive Keychain to add an account
          </Typography>
        </Box>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Hive Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
              disabled={signingInProgress}
              fullWidth
              autoFocus
              placeholder="Enter Hive username to monitor"
            />

            {signingInProgress && (
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Waiting for Keychain signature...
                </Typography>
              </Stack>
            )}

            <Button
              onClick={handleAddAccount}
              variant="contained"
              size="large"
              disabled={signingInProgress || !newUsername.trim()}
              fullWidth
            >
              {signingInProgress ? "Signing..." : "Add with Keychain"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
