"use client";

import { useAccountAuthState } from "@/hooks/useAccountAuthState";
import { formatTokenExpiry } from "@/lib/shared/token-utils";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Chip, Tooltip } from "@mui/material";

interface Props {
  username: string;
}

/**
 * Per-account SPL token chip.
 *
 * Reads the token state from `AccountsContext` via `useAccountAuthState` — no
 * server call of its own, so a dashboard with N cards no longer makes N
 * `getAccountTokenStatus` round trips.
 *
 * The Re-authenticate action lives on the card-level banner in `PlayerCard`
 * (`NeedsReAuthNotice`), which also names the sections that are unavailable —
 * keeping one button per card instead of one per status widget.
 */
export const AuthenticationStatus = ({ username }: Props) => {
  const { known, needsReAuth, expiryState, jwtExpiresAt } = useAccountAuthState(username);

  if (!known) {
    return (
      <Tooltip title="Authentication status unknown">
        <Chip icon={<LockIcon />} label="Unknown" size="small" variant="outlined" />
      </Tooltip>
    );
  }

  if (needsReAuth) {
    return (
      <Tooltip
        title={`Re-authenticate to restore private data — ${formatTokenExpiry(jwtExpiresAt)}`}
      >
        <Chip
          icon={<LockIcon />}
          label={expiryState === "expired" ? "Token Expired" : "Not Authenticated"}
          color="warning"
          size="small"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`Token is valid — ${formatTokenExpiry(jwtExpiresAt)}`}>
      <Chip
        icon={<LockOpenIcon />}
        label="Authenticated"
        color="success"
        size="small"
        variant="outlined"
      />
    </Tooltip>
  );
};
