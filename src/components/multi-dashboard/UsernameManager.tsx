"use client";

import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";

/**
 * Placeholder component that directs users to the /users page
 * to manage their monitored accounts.
 */
export default function UsernameManager() {
  return (
    <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Manage monitored accounts on the Users page.
      </Typography>
      <Button
        component={Link}
        href="/users"
        variant="outlined"
        size="small"
        startIcon={<PersonAddIcon />}
        suppressHydrationWarning
      >
        Manage Accounts
      </Button>
    </Box>
  );
}
