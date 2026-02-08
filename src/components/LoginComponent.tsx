"use client";

import { useAuth } from "@/lib/frontend/context/AuthContext";
import { Logout as LogoutIcon } from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useState } from "react";

export default function LoginComponent() {
  const { user, loading: authLoading, error: authError, clearError, login, logout } = useAuth();

  // Separate loading states
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLoginClick = (event: React.MouseEvent<HTMLElement>) => {
    if (user) {
      setAnchorEl(event.currentTarget);
    } else {
      setLoginDialogOpen(true);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  const handleDialogClose = () => {
    setLoginDialogOpen(false);
    setUsername("");
    setError(null);
    clearError();
    setSigningInProgress(false);
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      setError(new Error("Please enter a username"));
      return;
    }

    setError(null);
    setSigningInProgress(true);

    try {
      await login(username.toLowerCase());
      if (authError) {
        throw authError;
      }
      // Close dialog on success
      handleDialogClose();
    } catch (err) {
      setError(err as Error);
    } finally {
      setSigningInProgress(false);
    }
  };

  // Show loading state from useAuth on initial app load
  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
        }}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <>
      <Box
        onClick={handleLoginClick}
        sx={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          borderRadius: 1,
          outline: "none",
          "&:hover": {
            backgroundColor: "action.hover",
          },
          "&:focus": {
            boxShadow: "none",
            outline: "none",
          },
        }}
        tabIndex={0}
      >
        {user?.username ? (
          <>
            <Avatar sx={{ width: 32, height: 32 }}>
              <Image
                src={`https://images.hive.blog/u/${user.username}/avatar`}
                alt={user.username}
                width={32}
                height={32}
              />
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {user.username}
            </Typography>
          </>
        ) : (
          <Button variant="outlined" size="small">
            Login
          </Button>
        )}
      </Box>

      {/* User Menu (when logged in) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
          Logout
        </MenuItem>
      </Menu>

      {/* Login Dialog (when not logged in) */}
      <Dialog open={loginDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <Box sx={{ pt: 3, px: 3 }}>
          <Typography variant="h6" textAlign="center">
            Sign In with Hive Keychain
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Sign in with your Hive account using Keychain
          </Typography>
        </Box>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Hive Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              disabled={signingInProgress}
              fullWidth
              autoFocus
              placeholder="Enter your Hive username"
            />

            {error && (
              <Alert severity="error" variant="outlined">
                {error.message}
              </Alert>
            )}

            {signingInProgress && (
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Waiting for Keychain signature...
                </Typography>
              </Stack>
            )}

            <Button
              onClick={handleLogin}
              variant="contained"
              size="large"
              disabled={signingInProgress || !username.trim()}
              fullWidth
            >
              {signingInProgress ? "Signing..." : "Sign In with Keychain"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
