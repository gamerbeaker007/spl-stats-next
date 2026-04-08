import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { listMonitoredAccounts } from "@/lib/backend/db/monitored-accounts";
import { hasAnySeasonData } from "@/lib/backend/db/season-balances";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type React from "react";
import Link from "next/link";

export default async function PageGuard({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Log in to view this page.</Alert>
      </Box>
    );
  }

  const accounts = await listMonitoredAccounts(user.id);

  if (!accounts.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No monitored accounts found. Go to <Link href="/users">account management</Link> to add
          accounts.
        </Alert>
      </Box>
    );
  }

  const usernames = accounts.map((a) => a.username);
  const hasData = await hasAnySeasonData(usernames);

  if (!hasData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No data available yet. The background worker may still be syncing your data. Check{" "}
          <Link href="/users">account management</Link> for sync state.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}
