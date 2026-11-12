import PortfolioInventoryPage from "@/components/portfolio/PortfolioInventoryPage";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function PortfolioInventoryRoute() {
  return (
    <PageErrorBoundary>
      <PortfolioInventoryPage />
    </PageErrorBoundary>
  );
}
