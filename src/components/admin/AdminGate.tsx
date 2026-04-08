import AdminLogsSkeleton from "@/components/admin/AdminLogsSkeleton";
import BattleImport from "@/components/admin/BattleImport";
import BattleImportSkeleton from "@/components/admin/BattleImportSkeleton";
import DbSizeContent from "@/components/admin/DbSizeContent";
import DbSizeSkeleton from "@/components/admin/DbSizeSkeleton";
import InvestmentImport from "@/components/admin/InvestmentImport";
import InvestmentImportSkeleton from "@/components/admin/InvestmentImportSkeleton";
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
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
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

  const appVersion = process.env.APP_VERSION ?? "unknown";

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h6" component="h1">
          Admin
        </Typography>
        <Chip label={`Version: ${appVersion}`} size="small" variant="outlined" />
      </Box>
      <PageErrorBoundary>
        <Suspense fallback={<WorkerStatusSkeleton />}>
          <WorkerStatusContent />
        </Suspense>
      </PageErrorBoundary>
      <PageErrorBoundary>
        <Suspense fallback={<DbSizeSkeleton />}>
          <DbSizeContent />
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
        <Suspense fallback={<InvestmentImportSkeleton />}>
          <InvestmentImport />
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
