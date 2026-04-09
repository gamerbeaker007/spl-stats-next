import PortfolioServer from "@/components/portfolio/PortfolioServer";
import PortfolioSkeleton from "@/components/portfolio/PortfolioSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Suspense } from "react";

export default function PortfolioPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioServer />
      </Suspense>
    </PageErrorBoundary>
  );
}
