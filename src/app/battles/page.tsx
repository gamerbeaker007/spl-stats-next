import BestCardsContent from "@/components/battles/BestCardsContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function BattlesPage() {
  return (
    <PageErrorBoundary>
      <BestCardsContent />
    </PageErrorBoundary>
  );
}
