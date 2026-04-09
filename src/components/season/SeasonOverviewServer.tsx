import { Alert, Box } from "@mui/material";

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

  return <SeasonOverviewContent accounts={usernames} />;
}
