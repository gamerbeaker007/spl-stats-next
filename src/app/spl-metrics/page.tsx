import { Suspense } from "react";

import SplMetricsServer from "@/components/spl-metrics/SplMetricsServer";
import SplMetricsSkeleton from "@/components/shared/skeletons/SplMetricsSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export const metadata = { title: "SPL Metrics" };

export default function SplMetricsPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<SplMetricsSkeleton />}>
        <SplMetricsServer />
      </Suspense>
    </PageErrorBoundary>
  );
}
