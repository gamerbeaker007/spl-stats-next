import HiveBlogServer from "@/components/hive-blog/HiveBlogServer";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import { Suspense } from "react";

export default function HiveBlogPage() {
  return (
    <Box>
      <PageErrorBoundary>
        <Suspense fallback={<Skeleton variant="rounded" height={200} sx={{ m: 2 }} />}>
          <HiveBlogServer />
        </Suspense>
      </PageErrorBoundary>
      <Divider sx={{ my: 3 }} />
    </Box>
  );
}
