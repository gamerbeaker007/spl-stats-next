import CardDetailContent from "@/components/battles/CardDetailContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import BattlePageSkeleton from "@/components/shared/skeletons/BattlePageSkeleton";
import { Suspense } from "react";

interface CardDetailPageProps {
  params: Promise<{ cardDetailId: string }>;
}

// Awaiting `params` makes a component dynamic. Keep it in its own async
// component inside <Suspense> so the static shell renders immediately.
async function CardDetailResolver({ params }: { params: Promise<{ cardDetailId: string }> }) {
  const { cardDetailId } = await params;
  const id = parseInt(cardDetailId, 10);
  return <CardDetailContent cardDetailId={id} />;
}

export default function CardDetailPage({ params }: CardDetailPageProps) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<BattlePageSkeleton />}>
        <CardDetailResolver params={params} />
      </Suspense>
    </PageErrorBoundary>
  );
}
