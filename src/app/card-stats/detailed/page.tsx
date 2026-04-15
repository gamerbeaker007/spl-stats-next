import DetailedDistributionContent from "@/components/card-stats/DetailedDistributionContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { getCardStatsRows } from "@/lib/backend/actions/card-stats/cardStatsAction";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detailed Card Distribution",
};

export default async function DetailedPage() {
  const rows = await getCardStatsRows();
  return (
    <PageErrorBoundary>
      <DetailedDistributionContent rows={rows} />
    </PageErrorBoundary>
  );
}
