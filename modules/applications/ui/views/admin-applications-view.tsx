import { Suspense } from "react";
import { AdminApplicationsSection, AdminApplicationsSkeleton } from "../sections/admin-applications-section";

export function AdminApplicationsView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Review queue</h1>
        <p className="text-sm text-muted-foreground">Filter and process submitted verification applications.</p>
      </header>
      <Suspense fallback={<AdminApplicationsSkeleton />}>
        <AdminApplicationsSection />
      </Suspense>
    </div>
  );
}
