import CAGoldRewardsClient from "@/components/jackpot-prizes/ca-gold-rewards/CAGoldRewardsClient";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { Suspense } from "react";

async function CAGoldRewardsContent() {
  const cardDetails = await getCardDetails();
  return <CAGoldRewardsClient cardDetails={cardDetails} />;
}

export default function CAGoldRewardsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CAGoldRewardsContent />
    </Suspense>
  );
}
