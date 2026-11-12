import PortfolioShellServer from "@/components/portfolio/PortfolioShellServer";
import PortfolioSkeleton from "@/components/portfolio/PortfolioSkeleton";
import PageGuard from "@/components/shared/PageGuard";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Suspense } from "react";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PortfolioSkeleton />}>
        <PageGuard>
          <PortfolioShellServer>{children}</PortfolioShellServer>
        </PageGuard>
      </Suspense>
    </PageErrorBoundary>
  );
}
