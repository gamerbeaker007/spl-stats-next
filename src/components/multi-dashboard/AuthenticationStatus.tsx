"use client";

import { getAccountTokenStatus } from "@/lib/backend/actions/auth-actions";
import { useReAuth } from "@/hooks/useReAuth";
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const { reAuth, loading: loggingIn } = useReAuth();

  useEffect(() => {
    getAccountTokenStatus(username).then(setTokenStatus);
  }, [username]);

  const handleReAuth = async () => {
    setLoginError(null);
    const result = await reAuth(username);
    if (result.success) {
      setTokenStatus("valid");
    } else {
      setLoginError(result.error);
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
