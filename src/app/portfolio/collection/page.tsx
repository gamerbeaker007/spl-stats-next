import PortfolioCollectionPage from "@/components/portfolio/PortfolioCollectionPage";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function PortfolioCollectionRoute() {
  return (
    <PageErrorBoundary>
      <PortfolioCollectionPage />
    </PageErrorBoundary>
  );
}
