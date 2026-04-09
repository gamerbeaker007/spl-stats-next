import CardDetailContent from "@/components/battles/CardDetailContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import BattlePageSkeleton from "@/components/shared/skeletons/BattlePageSkeleton";
import { getMonitoredAccountNamesAction } from "@/lib/backend/actions/battle-overview-actions";
import { Suspense } from "react";

interface CardDetailPageProps {
  params: Promise<{ cardDetailId: string }>;
  searchParams: Promise<{ account?: string }>;
}

async function CardDetailResolver({
  params,
  searchParams,
}: {
  params: Promise<{ cardDetailId: string }>;
  searchParams: Promise<{ account?: string }>;
}) {
  const [{ cardDetailId }, { account: rawAccount }] = await Promise.all([params, searchParams]);
  const id = parseInt(cardDetailId, 10);

  // Validate the requested account against the user's own monitored accounts.
  // Any value not in the list is silently dropped — prevents data leakage.
  let initialAccount = "";
  if (rawAccount) {
    const allowed = await getMonitoredAccountNamesAction();
    if (allowed.includes(rawAccount)) {
      initialAccount = rawAccount;
    }
  }

  return <CardDetailContent cardDetailId={id} initialAccount={initialAccount} />;
}

export default function CardDetailPage({ params, searchParams }: CardDetailPageProps) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<BattlePageSkeleton />}>
        <CardDetailResolver params={params} searchParams={searchParams} />
      </Suspense>
    </PageErrorBoundary>
  );
}
