import AdminGate from "@/components/admin/AdminGate";
import AdminLogsSkeleton from "@/components/admin/AdminLogsSkeleton";
import WorkerStatusSkeleton from "@/components/admin/WorkerStatusSkeleton";
import { Suspense } from "react";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <>
          <WorkerStatusSkeleton />
          <AdminLogsSkeleton />
        </>
      }
    >
      <AdminGate />
    </Suspense>
  );
}
