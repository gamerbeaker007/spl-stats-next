"use client";

import { useReAuth } from "@/hooks/useReAuth";
import { reAuthReasonLabel, type ReAuthReason } from "@/lib/shared/authenticated-result";
import { formatTokenExpiry } from "@/lib/shared/token-utils";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import { useState } from "react";

export type NeedsReAuthVariant = "banner" | "hint" | "alert";

interface Props {
  username: string;
  /** What is unavailable: a section name, or a comma-joined list for the banner. */
  label: string;
  reason?: ReAuthReason;
  jwtExpiresAt?: Date | null;
  /**
   * `banner` — one compact card-level row with the Re-authenticate button.
   * `hint`   — one muted line inside a section, no button.
   * `alert`  — MUI Alert with the button, for dialogs.
   */
  variant?: NeedsReAuthVariant;
  /** Called after a successful re-auth so the caller can re-fetch. */
  onReAuthenticated?: () => void | Promise<void>;
}

/**
 * The single place the "this needs re-authentication" state is worded and
 * actioned. Every dashboard section routes through it so a dead SPL token never
 * shows up as a blank section or a bare red "Error" chip again.
 */
export default function NeedsReAuthNotice({
  username,
  label,
  reason,
  jwtExpiresAt,
  variant = "hint",
  onReAuthenticated,
}: Props) {
  const { reAuth, loading } = useReAuth();
  const [error, setError] = useState<string | null>(null);

  const detail = `${label}: ${reAuthReasonLabel(reason)}${
    jwtExpiresAt ? ` (${formatTokenExpiry(jwtExpiresAt)})` : ""
  }`;

  const handleReAuth = async () => {
    setError(null);
    const result = await reAuth(username);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await onReAuthenticated?.();
  };

  const reAuthButton = (
    <Button
      size="small"
      variant="outlined"
      color={error ? "error" : "warning"}
      startIcon={<RefreshIcon />}
      onClick={handleReAuth}
      disabled={loading}
    >
      {loading ? "Authenticating…" : "Re-authenticate"}
    </Button>
  );

  if (variant === "hint") {
    return (
      <Tooltip title={detail}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <LockIcon sx={{ fontSize: 14 }} color="warning" />
          <Typography variant="caption" color="text.secondary">
            Needs re-authentication
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  if (variant === "alert") {
    return (
      <Alert severity="warning" sx={{ mb: 2 }} action={reAuthButton}>
        {error ?? detail}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Tooltip title={detail}>
        <Chip
          icon={<LockIcon />}
          label={`Unavailable: ${label}`}
          color={error ? "error" : "warning"}
          size="small"
          variant="outlined"
        />
      </Tooltip>
      {reAuthButton}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
