import PlayerStatusDashboard from "@/components/multi-dashboard/PlayerStatusDashboard";
import PlayerStatusDashboardSkeleton from "@/components/multi-dashboard/PlayerStatusDashboardSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Suspense } from "react";

export default function MultiUserDashboardPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PlayerStatusDashboardSkeleton />}>
        <PlayerStatusDashboard />
      </Suspense>
    </PageErrorBoundary>
  );
}
