import { Alert, Box } from "@mui/material";

import PortfolioContent from "@/components/portfolio/PortfolioContent";
import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";

export default async function PortfolioServer() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please login to view your portfolio.</Alert>
      </Box>
    );
  }

  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);

  return <PortfolioContent allAccounts={usernames} />;
}
