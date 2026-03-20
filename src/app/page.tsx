import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Suspense } from "react";
import HomeContent from "@/components/home/HomeContent";
import { Skeleton } from "@mui/material";

export default function HomePage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<Skeleton variant="rounded" height={48} />}>
        <HomeContent />
      </Suspense>
    </PageErrorBoundary>
  );
}
