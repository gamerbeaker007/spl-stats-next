import AdminLogsSkeleton from "@/components/admin/AdminLogsSkeleton";
import BattleImport from "@/components/admin/BattleImport";
import BattleImportSkeleton from "@/components/admin/BattleImportSkeleton";
import LogsContent from "@/components/admin/LogsContent";
import PortfolioImport from "@/components/admin/PortfolioImport";
import PortfolioImportSkeleton from "@/components/admin/PortfolioImportSkeleton";
import WorkerStatusContent from "@/components/admin/WorkerStatusContent";
import WorkerStatusSkeleton from "@/components/admin/WorkerStatusSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { getCurrentUser } from "@/lib/backend/actions/auth-actions";
import { isAdmin } from "@/lib/backend/auth/admin";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { Suspense } from "react";

export default async function AdminGate() {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user.username)) {
    return (
      <Box>
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
      <PageErrorBoundary>
        <Suspense fallback={<PortfolioImportSkeleton />}>
          <PortfolioImport />
        </Suspense>
      </PageErrorBoundary>
      <PageErrorBoundary>
        <Suspense fallback={<BattleImportSkeleton />}>
          <BattleImport />
        </Suspense>
      </PageErrorBoundary>
    </>
  );
}
