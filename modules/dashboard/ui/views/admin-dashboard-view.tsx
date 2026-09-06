import { AdminDashboardSection } from "../sections/admin-dashboard-section";

export function AdminDashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-muted-foreground">Operational overview of applications, certificates, and workload.</p>
      </header>
      <AdminDashboardSection />
    </div>
  );
}
