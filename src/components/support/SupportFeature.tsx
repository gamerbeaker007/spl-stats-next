"use client";

import { useAuth } from "@/lib/frontend/context/AuthContext";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useState } from "react";
import LoginComponent from "../top-bar/LoginComponent";
import DonationSection from "./DonationSection";
import ValidatorSupport from "./ValidatorSupport";

interface SnackMessage {
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

interface SupportFeatureProps {
  compact?: boolean;
}

export default function SupportFeature({ compact = false }: Readonly<SupportFeatureProps>) {
  const { user, loading: authLoading } = useAuth();
  const [snack, setSnack] = useState<SnackMessage | null>(null);

  const showMessage = useCallback(
    (message: string, severity: SnackMessage["severity"] = "info") => {
      setSnack({ message, severity });
    },
    []
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: compact ? 2 : 3 }}>
      {!user && !authLoading && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoginComponent />
        </Box>
      )}

      <ValidatorSupport
        username={user?.username ?? null}
        authLoading={authLoading}
        onMessage={showMessage}
      />

      <DonationSection
        username={user?.username ?? null}
        authLoading={authLoading}
        onMessage={showMessage}
      />

      <Snackbar
        open={snack !== null}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)} variant="filled">
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
