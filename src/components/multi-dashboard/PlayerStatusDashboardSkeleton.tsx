import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

function PlayerCardSkeleton() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          {/* Header: avatar + name + drag handle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={120} height={28} />
            <Skeleton variant="circular" width={24} height={24} sx={{ ml: "auto" }} />
          </Box>

          {/* Stat rows */}
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="25%" />
            </Box>
          ))}

          {/* Bottom bar */}
          <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
            <Skeleton variant="rounded" width={80} height={32} />
            <Skeleton variant="rounded" width={80} height={32} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PlayerStatusDashboardSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 2, md: 6, lg: 8 } }}>
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
            <PlayerCardSkeleton />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
