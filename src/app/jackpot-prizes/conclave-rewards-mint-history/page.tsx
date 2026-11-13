import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { Suspense } from "react";

export default function ConclaveRewardsMintHistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditionTierCardsServer
        edition={17}
        tier={14}
        title="Conclave Rewards Mint History"
        subtitle="Jackpot chest reward foils (edition 17, tier 14)"
        recentWinnersLabel="Recent Winners (last 8 days)"
      />
    </Suspense>
  );
}
