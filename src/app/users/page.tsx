import { getCurrentUser, getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { Alert, Box } from "@mui/material";
import UserManagementContent from "./UserManagementContent";

export default async function UserManagementPage() {
  // Get current user on server
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please login to manage monitored accounts</Alert>
      </Box>
    );
  }

  // Get monitored accounts on server
  const accounts = await getMonitoredAccounts();

  return (
    <UserManagementContent
      mainUsername={user.username}
      initialAccounts={accounts.map((acc) => ({
        id: acc.id,
        username: acc.username,
        createdAt: acc.createdAt,
      }))}
    />
  );
}
