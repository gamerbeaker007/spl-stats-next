import CardDetailContent from "@/components/battles/CardDetailContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

interface CardDetailPageProps {
  params: Promise<{ cardDetailId: string }>;
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardDetailId } = await params;
  const id = parseInt(cardDetailId, 10);

  return (
    <PageErrorBoundary>
      <CardDetailContent cardDetailId={id} />
    </PageErrorBoundary>
  );
}
