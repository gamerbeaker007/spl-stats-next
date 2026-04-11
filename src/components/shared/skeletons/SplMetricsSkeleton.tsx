import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export default function SplMetricsSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Skeleton variant="rectangular" height={36} width={340} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={36} width={200} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={36} width={280} sx={{ mb: 3, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 1 }} />
    </Box>
  );
}
