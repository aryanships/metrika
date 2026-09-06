import { OwnerDashboardSection } from "@/modules/dashboard/ui/owner-dashboard-section";

export default function OwnerDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your instruments, certificates, and verification lifecycle.</p>
      </header>
      <OwnerDashboardSection />
    </div>
  );
}
