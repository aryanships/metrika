import { FieldWorkOrdersSection } from "@/modules/dashboard/ui/field-work-orders-section";

export default function FieldWorkOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Work orders</h1>
        <p className="text-sm text-muted-foreground">Your assigned verification work, grouped by status.</p>
      </header>
      <FieldWorkOrdersSection />
    </div>
  );
}
