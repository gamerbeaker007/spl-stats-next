import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import AdminLogsSkeleton from "@/components/admin/AdminLogsSkeleton";
import LogsContent from "@/components/admin/LogsContent";
import WorkerStatusContent from "@/components/admin/WorkerStatusContent";
import WorkerStatusSkeleton from "@/components/admin/WorkerStatusSkeleton";
import { isAdmin } from "@/lib/backend/auth/admin";
import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.username)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Box>
    );
  }

  return (
    <>
      <PageErrorBoundary>
        <Suspense fallback={<WorkerStatusSkeleton />}>
          <WorkerStatusContent />
        </Suspense>
      </PageErrorBoundary>
      <PageErrorBoundary>
        <Suspense fallback={<AdminLogsSkeleton />}>
          <LogsContent />
        </Suspense>
      </PageErrorBoundary>
    </>
  );
}
