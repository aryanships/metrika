import { SystemDashboardSection } from "../sections/system-dashboard-section";

export function SystemDashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">System Administration</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide master data, account provisioning, and audit.
        </p>
      </header>
      <SystemDashboardSection />
    </div>
  );
}
