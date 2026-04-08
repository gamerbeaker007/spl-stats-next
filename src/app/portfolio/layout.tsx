import PageGuard from "@/components/shared/PageGuard";
import { Suspense } from "react";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PageGuard>{children}</PageGuard>
    </Suspense>
  );
}
