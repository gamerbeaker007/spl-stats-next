import {
  Box,
  Card,
  CardContent,
  Paper,
  Skeleton,
  Stack,
  TableContainer,
  Typography,
} from "@mui/material";

export default function WorkerStatusSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Worker Status</Typography>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Skeleton variant="rounded" width={90} height={24} />
              <Skeleton variant="text" width={200} />
              <Skeleton variant="text" width={120} />
            </Stack>
          </CardContent>
        </Card>
        <TableContainer component={Paper} variant="outlined">
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="text" height={40} sx={{ my: 0.5 }} />
            ))}
          </Box>
        </TableContainer>
      </Stack>
    </Box>
  );
}
