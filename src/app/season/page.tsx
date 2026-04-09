import { Suspense } from "react";

import SeasonOverviewServer from "@/components/season/SeasonOverviewServer";
import SeasonOverviewSkeleton from "@/components/season/SeasonOverviewSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function SeasonOverviewPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<SeasonOverviewSkeleton />}>
        <SeasonOverviewServer />
      </Suspense>
    </PageErrorBoundary>
  );
}
