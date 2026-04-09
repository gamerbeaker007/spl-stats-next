import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function InvestmentImportSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Investment Tracking
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="rounded" width={120} height={36} />
          <Skeleton variant="rounded" width={80} height={36} />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="rounded" width={160} height={40} />
          <Skeleton variant="rounded" width={180} height={40} />
          <Skeleton variant="rounded" width={140} height={40} />
          <Skeleton variant="rounded" width={90} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Paper>
    </Box>
  );
}
