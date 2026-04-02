import PlayerStatusDashboard from "@/components/multi-dashboard/PlayerStatusDashboard";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import UserManagementSkeleton from "@/components/users/UserManagementSkeleton";
import { Suspense } from "react";

export default function MultiUserDashboardPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<UserManagementSkeleton />}>
        {" "}
        {/* TODO: create a specific skeleton for the multi-dashboard page if needed, but this is good enough for now since it has a similar structure to the user management page */}
        <PlayerStatusDashboard />;
      </Suspense>
    </PageErrorBoundary>
  );
}
