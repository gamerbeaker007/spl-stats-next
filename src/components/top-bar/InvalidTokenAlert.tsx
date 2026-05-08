"use client";

import { getTokenAlertAccounts, type TokenAlertAccount } from "@/lib/backend/actions/auth-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { getTokenExpiryState } from "@/lib/shared/token-utils";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MdLockOpen } from "react-icons/md";

export default function InvalidTokenAlert() {
  const [alerts, setAlerts] = useState<TokenAlertAccount[]>([]);
  const { reAuthVersion, tokenStatusVersion } = useAuth();

  useEffect(() => {
    getTokenAlertAccounts().then(setAlerts);
  }, [reAuthVersion, tokenStatusVersion]);

  if (alerts.length === 0) return null;

  const expiredAccounts = alerts.filter(
    (a) =>
      a.tokenStatus === "invalid" ||
      a.tokenStatus === "unknown" ||
      getTokenExpiryState(a.jwtExpiresAt) === "expired"
  );
  // Warning: expiring soon OR legacy (valid but no expiry tracking)
  const expiringSoonAccounts = alerts.filter(
    (a) =>
      a.tokenStatus === "valid" &&
      (getTokenExpiryState(a.jwtExpiresAt) === "expiring_soon" || !a.jwtExpiresAt)
  );

  const hasExpired = expiredAccounts.length > 0;
  const iconColor = hasExpired ? "error" : "warning";

  const expiredNames = expiredAccounts.map((a) => a.username).join(", ");
  const soonNames = expiringSoonAccounts.map((a) => a.username).join(", ");
  const parts: string[] = [];
  if (expiredAccounts.length > 0) {
    parts.push(
      `${expiredNames} ${expiredAccounts.length === 1 ? "has an" : "have"} expired SPL token${expiredAccounts.length !== 1 ? "s" : ""}`
    );
  }
  if (expiringSoonAccounts.length > 0) {
    parts.push(
      `${soonNames} ${expiringSoonAccounts.length === 1 ? "has a" : "have"} token${expiringSoonAccounts.length !== 1 ? "s" : ""} expiring soon or without expiry tracking`
    );
  }
  const label = parts.join(" · ") + " — re-auth on the Users page";

  return (
    <Tooltip title={label}>
      <Link suppressHydrationWarning href="/users" style={{ color: "inherit" }}>
        <IconButton size="small" color={iconColor} aria-label="SPL token warning">
          <Badge badgeContent={alerts.length} color={hasExpired ? "error" : "warning"}>
            <MdLockOpen size={20} />
          </Badge>
        </IconButton>
      </Link>
    </Tooltip>
  );
}
