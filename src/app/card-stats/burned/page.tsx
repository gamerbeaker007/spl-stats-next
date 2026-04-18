import BurnedDistributionContent from "@/components/card-stats/BurnedDistributionContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { getCardStatsRows } from "@/lib/backend/actions/card-stats/cardStatsAction";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Burned BCX Distribution",
};

export default async function BurnedPage() {
  const rows = await getCardStatsRows();
  return (
    <PageErrorBoundary>
      <BurnedDistributionContent rows={rows} />
    </PageErrorBoundary>
  );
}
