import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function CardSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: 110 }}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="80%" height={16} sx={{ mt: 1 }} />
      <Skeleton width="70%" height={16} sx={{ mt: 0.5 }} />
    </Paper>
  );
}

export default function PortfolioSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Portfolio Overview
      </Typography>

      {/* Account selector */}
      <Skeleton variant="rounded" width={400} height={40} sx={{ mb: 3 }} />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <CardSkeleton />
          </Grid>
        ))}
      </Grid>

      {/* Investment table */}
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Skeleton width={200} height={28} />
        <Skeleton variant="rounded" width="100%" height={180} />
      </Stack>

      {/* Collection details */}
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Skeleton width={200} height={28} />
        <Skeleton variant="rounded" width="100%" height={200} />
      </Stack>

      {/* Other assets */}
      <Stack spacing={1}>
        <Skeleton width={200} height={28} />
        <Skeleton variant="rounded" width="100%" height={200} />
      </Stack>
    </Box>
  );
}
