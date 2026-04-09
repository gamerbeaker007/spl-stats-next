import HiveBlogContent from "@/components/hive-blog/HiveBlogContent";
import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Link from "next/link";

export default async function HiveBlogServer() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Log in to use the Hive Blog generator.</Alert>
      </Box>
    );
  }

  const accounts = await getMonitoredAccounts();

  if (accounts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No monitored accounts found. Go to <Link href="/users">account management</Link> to add
          accounts.
        </Alert>
      </Box>
    );
  }

  return <HiveBlogContent />;
}
