import { FieldDashboardSection } from "@/modules/dashboard/ui/field-dashboard-section";

export default function FieldDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Field dashboard</h1>
        <p className="text-sm text-muted-foreground">Your assigned verification work.</p>
      </header>
      <FieldDashboardSection />
    </div>
  );
}
