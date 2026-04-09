import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import HomeContent from "@/components/home/HomeContent";
import MuiSkeleton from "@mui/material/Skeleton";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<MuiSkeleton variant="rounded" height={48} />}>
        <HomeContent />
      </Suspense>
    </PageErrorBoundary>
  );
}
