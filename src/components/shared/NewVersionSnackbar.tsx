"use client";

import { useNewDeploymentAvailable } from "@/hooks/useNewDeploymentAvailable";
import { Alert, Button, IconButton, Snackbar } from "@mui/material";
import { MdClose, MdRefresh } from "react-icons/md";

interface NewVersionSnackbarViewProps {
  open: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

/** Presentational snackbar — split out so Storybook can render it without a deploy. */
export function NewVersionSnackbarView({ open, onReload, onDismiss }: NewVersionSnackbarViewProps) {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ zIndex: 1500 }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{borderRadius: 6}}
        action={
          <>
            <Button color="inherit" size="small" startIcon={<MdRefresh />} onClick={onReload}>
              Reload
            </Button>
            <IconButton color="inherit" size="small" aria-label="Dismiss" onClick={onDismiss}>
              <MdClose />
            </IconButton>
          </>
        }
      >
        A new version of SPL Stats is available.
      </Alert>
    </Snackbar>
  );
}

/** Shows a "new version available — reload" prompt when a newer build is deployed. */
export default function NewVersionSnackbar() {
  const { available, reload, dismiss } = useNewDeploymentAvailable();
  return <NewVersionSnackbarView open={available} onReload={reload} onDismiss={dismiss} />;
}
