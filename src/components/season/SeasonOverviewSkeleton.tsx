import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function SeasonOverviewSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100 }}>
      <Skeleton variant="text" width={220} height={36} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={40} width={200} sx={{ mb: 3, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={36} width={320} sx={{ mb: 3, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1, mb: 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
