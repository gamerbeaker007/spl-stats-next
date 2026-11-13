import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { Suspense } from "react";

export default function FrontierExtraMintHistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditionTierCardsServer
        edition={17}
        tier={15}
        title="Frontier Extra Mint History"
        subtitle="Extra cards from the frontier era (edition 17, tier 15)"
        recentWinnersLabel="Recent Winners Frontier Extra (last 8 days)"
      />
    </Suspense>
  );
}
