import { AdminApplicationsSection } from "@/modules/applications/ui/sections/admin-applications-section";

export default function AdminApplicationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Review queue</h1>
        <p className="text-sm text-muted-foreground">Filter and process submitted verification applications.</p>
      </header>
      <AdminApplicationsSection />
    </div>
  );
}
