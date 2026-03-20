import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import UserManagementSkeleton from "@/components/users/UserManagementSkeleton";
import UserManagementServer from "@/components/users/UserManagementServer";
import { Suspense } from "react";

export default function UserManagementPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<UserManagementSkeleton />}>
        <UserManagementServer />
      </Suspense>
    </PageErrorBoundary>
  );
}
