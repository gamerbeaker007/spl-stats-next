import { Alert, Box } from "@mui/material";
import Link from "next/link";

import SeasonOverviewContent from "@/components/season/SeasonOverviewContent";
import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";

/**
 * Server component — fetches the current user and their monitored accounts,
 * then passes them down to the client-side interactive content.
 */
export default async function SeasonOverviewServer() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please login to view the season overview.</Alert>
      </Box>
    );
  }

  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);
  const now = new Date();
  const invalidAccounts = accounts
    .filter((a) => {
      if (a.splAccount?.tokenStatus === "invalid") return true;
      // Also catch tokens that have expired but the worker hasn't marked them yet
      const expiresAt = a.splAccount?.jwtExpiresAt;
      if (expiresAt && expiresAt < now) return true;
      return false;
    })
    .map((a) => a.username);

  return (
    <>
      {invalidAccounts.length > 0 && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="warning">
            {invalidAccounts.length === 1 ? `Account ` : `Accounts `}
            <strong>{invalidAccounts.join(", ")}</strong>
            {invalidAccounts.length === 1 ? ` has` : ` have`} an expired SPL token — season balance
            data will not update until you{" "}
            <Link suppressHydrationWarning href="/users">
              re-authenticate on the Users page
            </Link>
            .
          </Alert>
        </Box>
      )}
      <SeasonOverviewContent accounts={usernames} />
    </>
  );
}
