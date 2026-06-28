import FortuneWinnersClient from "@/components/jackpot-prizes/fortune-winners/FortuneWinnersClient";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { Suspense } from "react";

async function FortuneWinnersContent() {
  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);
  const cardDetails = await getCardDetails();

  return <FortuneWinnersClient monitoredAccounts={usernames} cardDetails={cardDetails} />;
}

export default function FrontierWinnersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FortuneWinnersContent />
    </Suspense>
  );
}
