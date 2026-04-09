import { getBattleAccessStatusAction } from "@/lib/backend/actions/battle-overview-actions";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type React from "react";

export default async function BattleAccessGuard({ children }: { children: React.ReactNode }) {
  const { isRestricted, isPartial } = await getBattleAccessStatusAction();

  if (isRestricted) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          This environment is limited to a specific set of accounts for battle data, and yours is
          not on the list. To access your own battle statistics, either run the site locally or
          contact the admin.
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {isPartial && (
        <Box sx={{ px: 2, pt: 2 }}>
          <Alert severity="info">
            Only some of your monitored accounts have battle data available in this environment. The
            account filter has been limited to those accounts.
          </Alert>
        </Box>
      )}
      {children}
    </>
  );
}
