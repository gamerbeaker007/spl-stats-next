"use client";

import { getAccountTokenStatus, reAuthMonitoredAccount } from "@/lib/backend/actions/auth-actions";
import { keychainSignBuffer } from "@/lib/frontend/keychain";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Chip, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  username: string;
}

type TokenStatus = "valid" | "invalid" | "unknown" | "not_found";

export const AuthenticationStatus = ({ username }: Props) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("unknown");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    getAccountTokenStatus(username).then(setTokenStatus);
  }, [username]);

  const handleReAuth = async () => {
    try {
      setLoggingIn(true);
      setLoginError(null);

      const timestamp = Date.now();
      const message = `${username.toLowerCase()}${timestamp}`;
      const signature = await keychainSignBuffer(username, message);

      const result = await reAuthMonitoredAccount(username, timestamp, signature);
      if (result.success) {
        setTokenStatus("valid");
      } else {
        setLoginError(result.error ?? "Re-authentication failed");
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Re-authentication failed");
    } finally {
      setLoggingIn(false);
    }
  };

  if (tokenStatus === "valid") {
    return (
      <Tooltip title="Token is valid — daily progress and private data accessible">
        <Chip
          icon={<LockOpenIcon />}
          label="Authenticated"
          color="success"
          size="small"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip
          title={
            tokenStatus === "invalid"
              ? "Token expired — re-authenticate to restore access"
              : "Authentication status unknown"
          }
        >
          <Chip
            icon={<LockIcon />}
            label={
              tokenStatus === "invalid"
                ? "Token Expired"
                : tokenStatus === "not_found"
                  ? "Not Authenticated"
                  : "Unknown"
            }
            color={loginError ? "error" : "warning"}
            size="small"
            variant="outlined"
          />
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleReAuth}
          disabled={loggingIn}
          color={loginError ? "error" : "primary"}
        >
          {loggingIn ? "Authenticating…" : "Re-authenticate"}
        </Button>
      </Box>
      {loginError && (
        <Chip
          label={loginError}
          color="error"
          size="small"
          variant="filled"
          sx={{ maxWidth: 300 }}
        />
      )}
    </Box>
  );
};
