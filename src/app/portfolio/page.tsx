import PortfolioValuePage from "@/components/portfolio/PortfolioValuePage";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function PortfolioPage() {
  return (
    <PageErrorBoundary>
      <PortfolioValuePage />
    </PageErrorBoundary>
  );
}
