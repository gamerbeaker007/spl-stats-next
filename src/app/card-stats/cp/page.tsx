import CpDistributionContent from "@/components/card-stats/CpDistributionContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { getCardStatsRows } from "@/lib/backend/actions/card-stats/cardStatsAction";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CP Analysis",
};

export default async function CpPage() {
  const rows = await getCardStatsRows();
  return (
    <PageErrorBoundary>
      <CpDistributionContent rows={rows} />
    </PageErrorBoundary>
  );
}
