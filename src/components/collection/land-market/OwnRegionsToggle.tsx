"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  Stack,
} from "@mui/material";

interface OwnRegionsToggleProps {
  account: string | null;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  regionCount: number;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** "Show Own Regions" switch shown directly under the account selector. */
export default function OwnRegionsToggle({
  account,
  enabled,
  onChange,
  regionCount,
  loaded,
  loading,
  error,
  onRetry,
}: Readonly<OwnRegionsToggleProps>) {
  const hasAccount = Boolean(account);
  const countLabel = hasAccount && loaded ? ` (${regionCount})` : "";

  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: "background.paper",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
        <FormControlLabel
          control={
            <Switch
              checked={hasAccount && enabled}
              onChange={(_event, checked) => onChange(checked)}
              disabled={!hasAccount}
            />
          }
          label={`Show Own Regions${countLabel}`}
        />
        {loading && hasAccount && <CircularProgress size={16} aria-label="Loading owned regions" />}
        {!hasAccount && (
          <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
            Select an account to only show listings in regions where it already owns land.
          </Box>
        )}
        {hasAccount && loaded && !error && (
          <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
            {regionCount === 0
              ? `${account} owns no land yet.`
              : `Regions where ${account} owns at least one plot.`}
          </Box>
        )}
      </Stack>
      {hasAccount && error && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          }
        >
          Could not load owned land for {account}: {error}
        </Alert>
      )}
    </Box>
  );
}
