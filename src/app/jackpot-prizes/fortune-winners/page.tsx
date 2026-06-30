import FortuneWinnersClient from "@/components/jackpot-prizes/fortune-winners/FortuneWinnersClient";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { Suspense } from "react";

async function FortuneWinnersContent() {
  return <FortuneWinnersClient />;
}

export default function FrontierWinnersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FortuneWinnersContent />
    </Suspense>
  );
}
