"use client";

import { getInvalidTokenAccounts } from "@/lib/backend/actions/auth-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MdLockOpen } from "react-icons/md";

export default function InvalidTokenAlert() {
  const [invalidAccounts, setInvalidAccounts] = useState<string[]>([]);
  const { reAuthVersion } = useAuth();

  useEffect(() => {
    getInvalidTokenAccounts().then(setInvalidAccounts);
  }, [reAuthVersion]);

  if (invalidAccounts.length === 0) return null;

  const label =
    invalidAccounts.length === 1
      ? `${invalidAccounts[0]} has an expired SPL token — re-auth on the Users page`
      : `${invalidAccounts.join(", ")} have expired SPL tokens — re-auth on the Users page`;

  return (
    <Tooltip title={label}>
      <Link suppressHydrationWarning href="/users" style={{ color: "inherit" }}>
        <IconButton size="small" color="warning" aria-label="Invalid SPL token warning">
          <Badge badgeContent={invalidAccounts.length} color="error">
            <MdLockOpen size={20} />
          </Badge>
        </IconButton>
      </Link>
    </Tooltip>
  );
}
