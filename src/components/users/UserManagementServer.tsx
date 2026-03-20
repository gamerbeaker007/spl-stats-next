import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { Alert, Box } from "@mui/material";
import UserManagementContent from "./UserManagementContent";

export default async function UserManagementServer() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please login to manage monitored accounts</Alert>
      </Box>
    );
  }

  const accounts = await getMonitoredAccounts();

  return (
    <UserManagementContent
      mainUsername={user.username}
      initialAccounts={accounts.map((acc) => ({
        id: acc.id,
        username: acc.username,
        createdAt: acc.createdAt,
        splAccountId: acc.splAccount.id,
        tokenStatus: acc.splAccount.tokenStatus as "valid" | "invalid" | "unknown",
      }))}
    />
  );
}
