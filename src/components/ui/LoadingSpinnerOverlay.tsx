import { Box, CircularProgress, Paper, Typography } from "@mui/material";

interface Props {
  loading: boolean;
  message: string;
}
export function LoadingSpinnerOverlay({ loading, message }: Readonly<Props>) {
  return (
    <Box sx={{ position: "relative" }}>
      {loading && (
        <Paper
          elevation={2}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            zIndex: 10,
          }}
        >
          <CircularProgress size={18} />
          <Typography variant="body2">{message}</Typography>
        </Paper>
      )}
    </Box>
  );
}
