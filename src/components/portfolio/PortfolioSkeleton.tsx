import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** Placeholder for the "current values" tiles row. */
export function PortfolioTilesSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, height: 110 }}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="80%" height={16} sx={{ mt: 1 }} />
            <Skeleton width="70%" height={16} sx={{ mt: 0.5 }} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

/** Placeholder for one portfolio chart section. */
export function PortfolioChartSkeleton() {
  return (
    <Stack spacing={1}>
      <Skeleton width={220} height={28} />
      <Skeleton variant="rounded" width="100%" height={400} />
    </Stack>
  );
}

export default function PortfolioSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio
      </Typography>
      <Skeleton variant="rounded" width={360} height={44} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" width={400} height={40} sx={{ mb: 3 }} />
      <Box sx={{ mb: 4 }}>
        <PortfolioTilesSkeleton />
      </Box>
      <PortfolioChartSkeleton />
    </Box>
  );
}
