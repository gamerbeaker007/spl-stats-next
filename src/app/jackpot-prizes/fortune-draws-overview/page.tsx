import FortuneWinnersServer from "@/components/jackpot-prizes/fortune-winners/FortuneWinnersServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Suspense } from "react";

export default function FrontierRewardDrawsPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <FortuneWinnersServer />
      </Suspense>
    </PageErrorBoundary>
  );
}
