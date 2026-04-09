import PageGuard from "@/components/shared/PageGuard";
import { Suspense } from "react";

export default function SeasonLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PageGuard>{children}</PageGuard>
    </Suspense>
  );
}
