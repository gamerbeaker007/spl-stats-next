import LosingContent from "@/components/battles/LosingContent";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";

export default function LosingPage() {
  return (
    <PageErrorBoundary>
      <LosingContent />
    </PageErrorBoundary>
  );
}
